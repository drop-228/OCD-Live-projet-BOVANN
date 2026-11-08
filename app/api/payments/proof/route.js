import crypto from 'crypto'
import {db} from '@/lib/supabaseAdmin'
export const runtime='nodejs'

export async function POST(req){
 const form=await req.formData().catch(()=>null)
 const reservationId=String(form?.get('reservation_id')||'')
 const file=form?.get('proof')
 if(!reservationId||!(file instanceof File))return Response.json({error:'Réservation et preuve obligatoires'},{status:400})
 const allowed=['image/jpeg','image/png','image/webp','application/pdf']
 if(!allowed.includes(file.type)||file.size>10*1024*1024)return Response.json({error:'Fichier invalide (10 Mo maximum)'},{status:400})
 const {data:r}=await db.from('reservations').select('id,status,price,payment_status').eq('id',reservationId).single()
 if(!r)return Response.json({error:'Réservation introuvable'},{status:404})
 if(r.status==='cancelled'||r.status==='refused'||r.status==='pending')return Response.json({error:'La preuve est acceptée après confirmation de la réservation par l’équipe.'},{status:409})
 if(r.payment_status==='paid')return Response.json({ok:true,idempotent:true})
 const ext=(file.name||'').toLowerCase().split('.').pop()||''
 const name=`${reservationId}/${Date.now()}-${crypto.randomUUID()}-${ext.replace(/[^a-z0-9.-]/g,'')}`
 const {error}=await db.storage.from('payment-proofs').upload(name,new Uint8Array(await file.arrayBuffer()),{contentType:file.type,upsert:false})
 if(error)return Response.json({error:error.message},{status:500})
 await db.from('payments').upsert({
  reservation_id:reservationId,
  provider:'transfer',
  provider_ref:`proof-${reservationId}`,
  amount:r.price||0,
  currency:'XOF',
  status:'processing',
  metadata:{storage_path:name}
 },{
  onConflict:'provider,provider_ref',
  ignoreDuplicates:true
 })
 await db.from('reservations').update({payment_status:'processing'}).eq('id',reservationId)
 return Response.json({ok:true,path:name})
}
