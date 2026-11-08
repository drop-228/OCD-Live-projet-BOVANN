import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!url || url.includes('abcdefghij')) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL avec le vrai projet Supabase.')
if (!serviceKey || serviceKey.startsWith('******')) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY avec la vraie clé service.')
if (!email || !password) throw new Error('Configure ADMIN_EMAIL et ADMIN_PASSWORD.')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data: users, error: listError } = await supabase.auth.admin.listUsers()
if (listError) throw listError

let user = users.users.find((item) => item.email?.toLowerCase() === email.toLowerCase())
if (!user) {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Administrateur OCD Live' },
  })
  if (created.error) throw created.error
  user = created.data.user
}

const { error: adminError } = await supabase
  .from('admins')
  .upsert({ user_id: user.id, email, name: 'Administrateur OCD Live', role: 'owner' }, { onConflict: 'user_id' })
if (adminError) throw adminError

console.log(`Compte administrateur prêt: ${email}`)
