import {db} from '@/lib/supabaseAdmin'

export const dynamic='force-dynamic'

export async function GET() {
  const {data,error}=await db.from('site_settings')
    .select('key,value')
    .in('key',['booking','payment','bank'])
  if(error)return Response.json({error:'Réglages indisponibles'},{status:503})
  const settings=Object.fromEntries((data||[]).map(row=>[row.key,row.value]))
  return Response.json({settings},{headers:{'Cache-Control':'no-store'}})
}
