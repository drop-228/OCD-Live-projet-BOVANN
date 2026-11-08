import {db} from '@/lib/supabaseAdmin'

export const revalidate=60

const partnerFallback=[{
 id:'bovann-group-launch',
 name:'BOVANN GROUP',
 logo_light:'/media/bovann-group.webp',
 logo_dark:null,
 url:null,
 active:true,
 speed:'normal',
 sort:10
}]

export async function GET(){
 const {data,error}=await db.from('partners').select('*').eq('active',true).order('sort')
 if(error)return Response.json({partners:partnerFallback,preview:true},{headers:{'Cache-Control':'no-store'}})
 return Response.json({partners:data||[]},{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}})
}
