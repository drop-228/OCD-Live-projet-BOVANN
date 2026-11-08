import {db} from '@/lib/supabaseAdmin'
import {notifyClient} from '@/lib/notify'
import {hhmm} from '@/lib/slots'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const authorization = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({error: 'Non autorisé'}, {status: 401})
  }

  const t = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const {data, error} = await db.from('reservations')
    .select('*')
    .eq('status', 'accepted')
    .eq('live_date', t)
    .eq('reminder_sent', false)

  if (error) return Response.json({error: 'Erreur serveur'}, {status: 500})

  for (const reservation of data || []) {
    await notifyClient(
      reservation,
      'Rappel : ton live OCD Live demain',
      `Bonjour ${reservation.name}, rappel : ton live OCD Live a lieu demain (${t}) à ${hhmm(reservation.start_time)}. À demain !`
    )
    await db.from('reservations').update({reminder_sent: true}).eq('id', reservation.id)
  }
  return Response.json({sent: (data || []).length})
}
