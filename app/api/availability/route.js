import {db} from '@/lib/supabaseAdmin'
import {SLOTS,SLOT_MIN,addMin,overlap,hhmm} from '@/lib/slots'
export const dynamic='force-dynamic'
export async function GET(req){
 const url=new URL(req.url)
 const mode=url.searchParams.get('mode')
 const month=url.searchParams.get('month')
 if(!['presentiel','distance'].includes(mode))return Response.json({error:'mode'},{status:400})
 const target=/^\d{4}-\d{2}$/.test(month||'')?month:'2026-12'
 const [year,monthNumber]=target.split('-').map(Number)
 const days=new Date(Date.UTC(year,monthNumber,0)).getUTCDate()
 const from=`${target}-01`
 const next=new Date(Date.UTC(year,monthNumber,1)).toISOString().slice(0,10)
 const {data:bookingSetting}=await db.from('site_settings').select('value').eq('key','booking').maybeSingle()
 const slots=Array.isArray(bookingSetting?.value?.slots)&&bookingSetting.value.slots.length?bookingSetting.value.slots:SLOTS
 const [{data:acc},{data:blk}]=await Promise.all([
  db.from('reservations').select('live_date,start_time,end_time').eq('status','accepted').eq('mode',mode).gte('live_date',from).lt('live_date',next),
  db.from('blocked_slots').select('live_date,start_time,end_time').gte('live_date',from).lt('live_date',next)])
 const un={}
 for(let d=1;d<=31;d++){
  if(d>days)break
  const date=`${target}-${String(d).padStart(2,'0')}`;const list=[]
  for(const s of slots){const e=addMin(s,SLOT_MIN)
   const a=(acc||[]).some(r=>r.live_date===date&&overlap(s,e,hhmm(r.start_time),hhmm(r.end_time)))
   const b=(blk||[]).some(r=>r.live_date===date&&(!r.start_time||overlap(s,e,hhmm(r.start_time),r.end_time?hhmm(r.end_time):addMin(hhmm(r.start_time),SLOT_MIN))))
   if(a||b)list.push(s)}
  if(list.length)un[date]=list}
 return Response.json({unavailable:un})}
