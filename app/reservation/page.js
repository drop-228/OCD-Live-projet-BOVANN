import Booking from '@/components/Booking'
import {db} from '@/lib/supabaseAdmin'
import {packageFallbacks} from '@/lib/packageFallbacks'

export const revalidate=60
export default async function ReservationPage(){
 const {data,error}=await db.from('packages').select('*').eq('active',true).order('sort')
 return <Booking packages={!error&&data?.length?data:packageFallbacks}/>
}
