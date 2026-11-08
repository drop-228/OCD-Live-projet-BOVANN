import {createClient} from '@supabase/supabase-js'
import {db} from '@/lib/supabaseAdmin'

function caller(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
 if(!token)return null
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{
  global:{headers:{Authorization:`Bearer ${token}`}},
  auth:{persistSession:false}
 })
}
async function admin(client){
 if(!client)return false
 const {data:{user}}=await client.auth.getUser()
 if(!user)return false
 const {data}=await db.from('admins').select('user_id').eq('user_id',user.id).maybeSingle()
 return Boolean(data)
}

export async function POST(req){
 const client=caller(req);if(!await admin(client))return Response.json({error:'Accès refusé'},{status:403})
 const body=await req.json().catch(()=>null)
 if(!body?.name)return Response.json({error:'Nom obligatoire'},{status:400})
 const row={name:String(body.name).trim().slice(0,120),description:body.description||null,short_description:body.short_description||body.description||null,
  price:body.price==null||body.price===''?null:Number(body.price),duration_min:Number(body.duration_min)||90,live_duration_min:Number(body.live_duration_min)||Number(body.duration_min)||90,
  live_count:Number(body.live_count)||1,modes:Array.isArray(body.modes)?body.modes:['presentiel','distance'],
  inclusions:Array.isArray(body.inclusions)?body.inclusions:[],deposit_percent:Math.max(0,Math.min(100,Number(body.deposit_percent)||0)),
  mention:body.mention||null,active:body.active!==false,sort:Number(body.sort)||0,price_confirmed:body.price_confirmed!==false}
 const {data,error}=await db.from('packages').upsert({...row,id:body.id||undefined},{onConflict:'id'}).select().single()
 if(error)return Response.json({error:error.message},{status:400})
 return Response.json({package:data})
}

export async function DELETE(req){
 const client=caller(req);if(!await admin(client))return Response.json({error:'Accès refusé'},{status:403})
 const {id}=await req.json().catch(()=>({}))
 if(!id)return Response.json({error:'ID obligatoire'},{status:400})
 const {count}=await db.from('reservations').select('id',{count:'exact',head:true}).eq('package_id',id)
 if(count)return Response.json({error:'Ce package est utilisé par des réservations. Masquez-le plutôt que de le supprimer.'},{status:409})
 const {error}=await db.from('packages').delete().eq('id',id)
 if(error)return Response.json({error:error.message},{status:400})
 return Response.json({ok:true})
}
