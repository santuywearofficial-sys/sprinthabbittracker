import { createClient } from '@/lib/supabase/server'
import LogsClient from './LogsClient'

export default async function ActivityLogsPage() {
  const supabase = await createClient()
  
  // Fetch recent activity logs
  const { data: rawLogs, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !rawLogs) {
    return <LogsClient initialLogs={[]} initialError={error?.message} />
  }

  // Collect unique user IDs to fetch
  const userIds = new Set<string>()
  rawLogs.forEach(log => {
    if (log.admin_user_id) userIds.add(log.admin_user_id)
    if (log.affected_user_id) userIds.add(log.affected_user_id)
  })

  // Fetch user details for all involved users
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .in('id', Array.from(userIds))

  const userMap = new Map((users || []).map(u => [u.id, u]))

  // Merge user details into logs
  const logs = rawLogs.map(log => ({
    ...log,
    admin: log.admin_user_id ? userMap.get(log.admin_user_id) || null : null,
    affected: log.affected_user_id ? userMap.get(log.affected_user_id) || null : null,
  }))

  return (
    <LogsClient initialLogs={logs} initialError={undefined} />
  )
}
