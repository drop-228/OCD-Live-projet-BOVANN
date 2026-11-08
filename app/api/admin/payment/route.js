import crypto from 'crypto'
import {db} from '@/lib/supabaseAdmin'
import {notifyClient,notifyAdmin} from '@/lib/notify'

async function authed(req){
 const t=(req.headers.get('authorization')||'').replace('Bearer ','');if(!t)return false
 const {data}=await db.auth.getUser(t);if(!data?.user)return false
 const {data:a}=await db.from('admins').select('user_id').eq('user_id',data.user.id).maybeSingle()
 return !!a
}

export async function POST(req){
 if(!(await authed(req)))return Response.json({error:'Non autorisé'},{status:401})
 const {reservation_id,provider='manual',provider_ref=null,mark_paid=true}=await req.json()
 const {data:r}=await db.from('reservations').select('*').eq('id',reservation_id).single()
 if(!r)return Response.json({error:'Réservation introuvable'},{status:404})
 const status=mark_paid?'paid':'processing'
  const providerRef=provider_ref||`manual-${provider}-${r.id}`
  const amount=status==='paid'?((r.deposit_amount&&r.payment_status==='processing')?r.deposit_amount:r.price||0):(r.deposit_amount||r.price||0)
  const {error}=await db.from('payments').upsert({
   reservation_id:r.id,provider,provider_ref:providerRef,
    amount,currency:'XOF',status,metadata:{marked_by_admin:true,deposit:Boolean(r.deposit_amount)}
  },{
   onConflict:'provider,provider_ref',
   ignoreDuplicates:false
 })
 if(error)return Response.json({error:error.message},{status:500})
 await db.from('reservations').update({payment_status:status,internal_note:r.internal_note}).eq('id',r.id)
 if(status==='paid'){
  await notifyClient(r,'Reçu OCD Live',`Bonjour ${r.name}, nous avons bien reçu ton paiement pour le live du ${r.live_date}.\nMontant : ${amount} FCFA.\nMerci — OCD Live`)
  await notifyAdmin(`Paiement reçu : ${r.name} (${r.phone}), ${amount} FCFA, réservation ${r.id}.`).catch(()=>{})
 }
 return Response.json({ok:true})
}
