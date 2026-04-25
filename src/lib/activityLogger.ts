import { createClient } from '@/lib/supabase/client'

export async function logActivity(
  adminUserId: string,
  actionType: string,
  affectedUserId: string | null,
  details?: Record<string, any>
) {
  const supabase = createClient()
  
  const { error } = await supabase.from('activity_logs').insert({
    admin_user_id: adminUserId,
    action_type: actionType,
    affected_user_id: affectedUserId,
    details: details || null
  })

  if (error) {
    console.error('Failed to log activity:', error)
  }
}
