import {db} from '@/lib/supabaseAdmin'
import {SLOTS,SLOT_MIN,FIRST_DAY,addMin,overlap,hhmm,toMin} from '@/lib/slots'
import {notifyAdmin} from '@/lib/notify'
import {packageFallbacks} from '@/lib/packageFallbacks'
const clean=(v,n=200)=>String(v??'').trim().slice(0,n)
export async function POST(req){
 const b=await req.json().catch(()=>null);if(!b)return Response.json({error:'Requête invalide'},{status:400})
 if(b.website)return Response.json({ok:true}) // honeypot anti-bot
 const ip=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'?'
 const phone=clean(b.phone,30),name=clean(b.name,80),business=clean(b.business,120)
 const today=new Date().toISOString().slice(0,10)
 const digits=phone.replace(/\D/g,'')
 const {data:bookingSetting}=await db.from('site_settings').select('value').eq('key','booking').maybeSingle()
 const booking=bookingSetting?.value||{}
 const bookingSlots=Array.isArray(booking.slots)&&booking.slots.length?booking.slots:SLOTS
 const opening=String(booking.opening_date||FIRST_DAY)
 const horizonMonths=Math.max(1,Math.min(36,Number(booking.horizon_months)||12))
 const max=new Date(`${today}T00:00:00Z`);max.setUTCMonth(max.getUTCMonth()+horizonMonths)
 const maxDate=max.toISOString().slice(0,10)
 if(!['presentiel','distance'].includes(b.mode)||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||b.date<opening||b.date<today||b.date>maxDate||!bookingSlots.includes(b.time))
  return Response.json({error:'Date ou heure invalide'},{status:400})
 if(name.length<2||digits.length<8||digits.length>15||!business)return Response.json({error:'Nom, téléphone et business obligatoires'},{status:400})
 if(b.mode==='distance'&&(!clean(b.city)||!clean(b.country)))return Response.json({error:'Ville et pays obligatoires'},{status:400})
 const since=(h)=>new Date(Date.now()-h*3600e3).toISOString()
 const [{count:cp},{count:ci}]=await Promise.all([
  db.from('reservations').select('id',{count:'exact',head:true}).eq('phone',phone).gte('created_at',since(24)),
  db.from('reservations').select('id',{count:'exact',head:true}).eq('ip',ip).gte('created_at',since(1))])
 if(cp>=3||ci>=5)return Response.json({error:'Trop de demandes. Réessaie plus tard ou écris-nous sur WhatsApp.'},{status:429})
 const {data:databasePackage}=await db.from('packages').select('*').eq('id',b.pkg).eq('active',true).maybeSingle()
 const pkg=databasePackage||packageFallbacks.find(item=>item.id===b.pkg&&item.active)
 if(!pkg)return Response.json({error:'Package invalide'},{status:400})
 const liveDuration=Number(pkg.live_duration_min||pkg.duration_min||SLOT_MIN)
 const end=addMin(b.time,liveDuration)
 const durationSlots=Math.ceil(liveDuration/SLOT_MIN)
 if(durationSlots>1){
  const index=bookingSlots.indexOf(b.time)
  if(index<0||index+durationSlots>bookingSlots.length)return Response.json({error:'Ce package dépasse les créneaux disponibles après cette heure.'},{status:400})
  const covered=bookingSlots.slice(index,index+durationSlots)
  const gaps=covered.some((slot,i)=>i>0&&toMin(slot)!==toMin(covered[i-1])+SLOT_MIN)
  if(gaps)return Response.json({error:'Il faut des créneaux consécutifs pour ce package.'},{status:400})
 }
 const selectedDates=Array.isArray(b.selectedDates)?b.selectedDates.filter(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)).filter((v,i,a)=>a.indexOf(v)===i):[]
 const datesForConflict=[b.date,...selectedDates.filter(v=>v!==b.date)]
 const conflictChecks=await Promise.all(datesForConflict.map(async date=>Promise.all([
  db.from('reservations').select('start_time,end_time').eq('status','accepted').eq('mode',b.mode).eq('live_date',date),
  db.from('blocked_slots').select('start_time,end_time').eq('live_date',date)
 ])))
 const taken=conflictChecks.some(([reservationResult,blockedResult])=>(reservationResult.data||[]).some(r=>overlap(b.time,end,hhmm(r.start_time),hhmm(r.end_time)))||(blockedResult.data||[]).some(r=>!r.start_time||overlap(b.time,end,hhmm(r.start_time),r.end_time?hhmm(r.end_time):addMin(hhmm(r.start_time),90))))
 if(taken)return Response.json({error:'Ce créneau vient d’être pris sur une des dates choisies. Choisis-en un autre.'},{status:409})
 const packageSnapshot={id:pkg.id,name:pkg.name,description:pkg.short_description||pkg.description||null,price:pkg.price,currency:'XOF',duration_min:pkg.duration_min,live_duration_min:pkg.live_duration_min||pkg.duration_min,live_count:pkg.live_count||1,inclusions:pkg.inclusions||[],modes:pkg.modes||[],deposit_percent:pkg.deposit_percent||0,mention:pkg.mention||null}
 const depositAmount=pkg.price==null?null:Math.round(pkg.price*(Number(pkg.deposit_percent||0)/100))
 const row={mode:b.mode,live_date:b.date,start_time:b.time,end_time:end,package_id:pkg.id,package_name:pkg.name,price:pkg.price,name,phone,email:clean(b.email,120)||null,business,product_desc:clean(b.product,400),city:clean(b.city,80),country:clean(b.country,80),address:clean(b.address,200),social:clean(b.social,200),payment_method:clean(b.payment,30),payment_status:'unpaid',ip,package_snapshot:packageSnapshot,selected_dates:selectedDates.length?selectedDates:[b.date],quote_status:pkg.price==null?'quote_to_send':null,deposit_amount:depositAmount}
 const {data,error}=await db.from('reservations').insert(row).select().single()
 if(error)return Response.json({error:'Erreur serveur'},{status:500})
 const where=b.mode==='presentiel'?'en présentiel à Lomé':`à distance depuis ${row.city}, ${row.country}`
 const link=(process.env.NEXT_PUBLIC_SITE_URL||'')+'/admin'
 notifyAdmin(`${name} fait ${business}. Réservation le ${b.date} de ${b.time} à ${end}, ${where}. Package : ${pkg.name}. Contact : ${phone}. Ouvrir l'admin : ${link}`).catch(()=>{})
 return Response.json({ok:true,id:data.id})}
