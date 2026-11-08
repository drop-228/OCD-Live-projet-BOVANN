import crypto from 'crypto'
import {db} from '@/lib/supabaseAdmin'
import {notifyClient,notifyAdmin} from '@/lib/notify'
export const runtime='nodejs'

function safeEqual(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y)}
async function verified(provider,req,raw){
 if(provider==='flutterwave'){
  const secret=process.env.FLUTTERWAVE_WEBHOOK_SECRET||''
  return !!secret && safeEqual(req.headers.get('verif-hash')||'',secret)
 }
 if(provider==='paypal'){
  const {PAYPAL_CLIENT_ID,PAYPAL_CLIENT_SECRET,PAYPAL_WEBHOOK_ID,PAYPAL_API_BASE}=process.env
  if(!PAYPAL_CLIENT_ID||!PAYPAL_CLIENT_SECRET||!PAYPAL_WEBHOOK_ID)return false
  const auth=await fetch((PAYPAL_API_BASE||'https://api-m.paypal.com')+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(PAYPAL_CLIENT_ID+':'+PAYPAL_CLIENT_SECRET).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
  if(!auth.ok)return false
  const {access_token}=await auth.json()
  const verify=await fetch((PAYPAL_API_BASE||'https://api-m.paypal.com')+'/v1/notifications/verify-webhook-signature',{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({
   auth_algo:req.headers.get('paypal-auth-algo'),cert_url:req.headers.get('paypal-cert-url'),transmission_id:req.headers.get('paypal-transmission-id'),
   transmission_sig:req.headers.get('paypal-transmission-sig'),transmission_time:req.headers.get('paypal-transmission-time'),
   webhook_id:PAYPAL_WEBHOOK_ID,webhook_event:JSON.parse(raw)
  })})
  if(!verify.ok)return false
  const result=await verify.json()
  return result.verification_status==='SUCCESS'
 }
 const secret=process.env[provider==='fedapay'?'FEDAPAY_WEBHOOK_SECRET':'CINETPAY_WEBHOOK_SECRET']||''
 const signature=req.headers.get('x-webhook-signature')||req.headers.get('x-signature')||''
 return !!secret && safeEqual(signature,crypto.createHmac('sha256',secret).update(raw).digest('hex'))
}
function text(payload,key){const v=payload?.[key]??payload?.data?.[key]??payload?.transaction?.[key]??payload?.metadata?.[key];return v==null?'':String(v)}

export async function POST(req,{params}){
 const provider=params.provider.toLowerCase()
 const raw=await req.text()
 let payload={}
 try{payload=JSON.parse(raw||'{}')}catch{return Response.json({error:'JSON invalide'},{status:400})}
 if(!await verified(provider,req,raw))return Response.json({error:'Signature invalide'},{status:401})

 const webhookMetadata=payload.metadata||payload.data?.metadata||{}
 const reservationId=text(payload,'reservation_id')||text(payload,'custom_id')||String(webhookMetadata.reservation_id||webhookMetadata.custom_id||'')
 const ref=text(payload,'provider_ref')||text(payload,'reference')||text(payload,'id')||text(payload,'transaction_id')
 const event=text(payload,'event')||text(payload,'status')||text(payload,'tx_status')||''
 const paid=['paid','successful','success','completed','approved','captured'].includes(event.toLowerCase())
 const failed=['failed','failure','cancelled','canceled','denied','expired'].includes(event.toLowerCase())
 const status=paid?'paid':failed?'failed':'processing'
 if(!reservationId||!ref)return Response.json({error:'Référence introuvable'},{status:400})
 const {data:r}=await db.from('reservations').select('*').eq('id',reservationId).single()
 if(!r)return Response.json({error:'Réservation introuvable'},{status:404})

 const amount=r.price||0
 const wasPaid=r.payment_status==='paid'
 const {error}=await db.from('payments').upsert(
  {reservation_id:r.id,provider,provider_ref:String(ref),amount,currency:'XOF',status,metadata:payload},
  {onConflict:'provider,provider_ref',ignoreDuplicates:false}
 )
 if(error){
  return Response.json({error:'Erreur journalisation'},{status:500})
 }
 await db.from('reservations').update({payment_status:status}).eq('id',r.id)
 if(status==='paid'&&!wasPaid){
  await notifyClient(r,'Reçu OCD Live',`Bonjour ${r.name}, ton paiement de ${amount} FCFA pour le live du ${r.live_date} est confirmé.\nMerci — OCD Live`)
  await notifyAdmin(`Paiement reçu via ${provider} : ${r.name}, ${amount} FCFA, réservation ${r.id}.`).catch(()=>{})
 }
 return Response.json({ok:true})
}
