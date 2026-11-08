import HomePage from '@/components/HomePage'
import {db} from '@/lib/supabaseAdmin'
import {packageFallbacks} from '@/lib/packageFallbacks'
export const revalidate=60
export default async function Home(){
 const {data,error}=await db.from('packages').select('*').eq('active',true).order('sort')
 return <HomePage packages={!error&&data?.length?data:packageFallbacks}/>}
