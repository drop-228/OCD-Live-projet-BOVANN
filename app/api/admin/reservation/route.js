import {db} from '@/lib/supabaseAdmin'
import {overlap,hhmm} from '@/lib/slots'
import {notifyClient} from '@/lib/notify'
async function authed(req){
 const t=(req.headers.get('authorization')||'').replace('Bearer ','');if(!t)return null
 const {data}=await db.auth.getUser(t);if(!data?.user)return null
 const {data:a}=await db.from('admins').select('user_id').eq('user_id',data.user.id).maybeSingle()
 return a?data.user:null}
export async function PATCH(req){
 const admin=await authed(req)
 if(!admin)return Response.json({error:'Non autorisé'},{status:401})
 const {id,action,reason,note}=await req.json()
 const {data:r}=await db.from('reservations').select('*').eq('id',id).single()
 if(!r)return Response.json({error:'Introuvable'},{status:404})
 const site=process.env.NEXT_PUBLIC_SITE_URL||''
 if(action==='note'){await db.from('reservations').update({internal_note:String(note||'').slice(0,1000)}).eq('id',id);await db.from('action_history').insert({reservation_id:id,admin_user_id:admin.id,action:'note'});return Response.json({ok:true})}
 if(action==='accept'){
  const {data:others}=await db.from('reservations').select('start_time,end_time').eq('status','accepted').eq('mode',r.mode).eq('live_date',r.live_date).neq('id',id)
  if((others||[]).some(o=>overlap(hhmm(r.start_time),hhmm(r.end_time),hhmm(o.start_time),hhmm(o.end_time))))
   return Response.json({error:'Créneau déjà accepté pour un autre client (même lieu).'},{status:409})
  const dates=Array.isArray(r.selected_dates)&&r.selected_dates.length?r.selected_dates:[r.live_date]
   for(const date of dates){
    const [{data:accepted},{data:blocked}]=await Promise.all([
     db.from('reservations').select('start_time,end_time').eq('status','accepted').eq('mode',r.mode).eq('live_date',date).neq('id',id),
     db.from('blocked_slots').select('start_time,end_time').eq('live_date',date)
    ])
    if((accepted||[]).some(o=>overlap(hhmm(r.start_time),hhmm(r.end_time),hhmm(o.start_time),hhmm(o.end_time)))||(blocked||[]).some(o=>!o.start_time||overlap(hhmm(r.start_time),hhmm(r.end_time),hhmm(o.start_time),o.end_time?hhmm(o.end_time):hhmm(r.end_time))))
     return Response.json({error:`Date multi-live ${date} déjà prise.`},{status:409})
   }
   const {error}=await db.from('reservations').update({status:'accepted',refusal_reason:null}).eq('id',id)
  if(error)return Response.json({error:'Créneau déjà pris.'},{status:409})
   for(const date of dates){
    const {data:existing}=await db.from('blocked_slots').select('id').eq('live_date',date).eq('start_time',hhmm(r.start_time)).maybeSingle()
    if(!existing)await db.from('blocked_slots').insert({live_date:date,start_time:hhmm(r.start_time),end_time:hhmm(r.end_time),reason:`Réservation acceptée ${r.package_name||''}`.trim()})
   }
  await db.from('action_history').insert({reservation_id:id,admin_user_id:admin.id,action:'accepted'})
  const via=await notifyClient(r,'Ton live OCD Live est confirmé',`Bonjour ${r.name}, ton live est confirmé ✅\n${r.live_date} de ${hhmm(r.start_time)} à ${hhmm(r.end_time)} (${r.mode==='presentiel'?'studio OCD Live, Lomé':'à distance'}).\nPackage : ${r.package_name}.\nÀ très vite ! — OCD Live`)
  return Response.json({ok:true,notified:via})}
 if(action==='refuse'){
  await db.from('reservations').update({status:'refused',refusal_reason:reason||null}).eq('id',id)
  await db.from('action_history').insert({reservation_id:id,admin_user_id:admin.id,action:'refused',reason:reason||null})
  const via=await notifyClient(r,'Ta demande OCD Live',`Bonjour ${r.name}, merci pour ta demande. Malheureusement nous ne pouvons pas la valider pour le ${r.live_date} à ${hhmm(r.start_time)}.${reason?`\nMotif : ${reason}`:''}\nTu peux choisir un autre créneau ici : ${site}\n— OCD Live`)
  return Response.json({ok:true,notified:via})}
 if(action==='pending'||action==='cancel'){
  await db.from('reservations').update({status:action==='pending'?'pending':'cancelled'}).eq('id',id)
  await db.from('action_history').insert({reservation_id:id,admin_user_id:admin.id,action})
  return Response.json({ok:true})}
 return Response.json({error:'Action inconnue'},{status:400})}
