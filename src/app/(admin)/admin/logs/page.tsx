import { createClient } from '@/lib/supabase/server'
import LogsClient from './LogsClient'

export default async function ActivityLogsPage() {
  const supabase = await createClient()
  
  // Fetch recent activity logs with user details
  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      admin:admin_user_id(email, full_name),
      affected:affected_user_id(email, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <LogsClient initialLogs={logs || []} initialError={error?.message} />
  )
}
