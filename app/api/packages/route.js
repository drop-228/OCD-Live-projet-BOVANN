import {db} from '@/lib/supabaseAdmin'
import {packageFallbacks} from '@/lib/packageFallbacks'
export const dynamic='force-dynamic'

export async function GET(){
 const {data,error}=await db.from('packages').select('*').eq('active',true).order('sort')
 if(error)return Response.json({packages:packageFallbacks,preview:true},{headers:{'Cache-Control':'no-store'}})
 if(!data?.length)return Response.json({packages:packageFallbacks,preview:true},{headers:{'Cache-Control':'no-store'}})
 return Response.json({packages:data},{headers:{'Cache-Control':'no-store'}})
}
