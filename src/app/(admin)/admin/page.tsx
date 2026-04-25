import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  
  // Fetch initial user list with roles
  const { data: users, error } = await supabase.rpc('search_users', {
    query_text: '',
    role_filter: 'all'
  })

  return (
    <AdminClient initialUsers={users || []} initialError={error?.message} />
  )
}
