'use client'

import { useState } from 'react'
import { FileText, Clock, User, Activity } from 'lucide-react'

interface ActivityLog {
  id: string
  admin_user_id: string
  action_type: string
  affected_user_id: string | null
  details: any
  created_at: string
  admin: { email: string; full_name: string } | null
  affected: { email: string; full_name: string } | null
}

interface Props {
  initialLogs: ActivityLog[]
  initialError?: string
}

export default function LogsClient({ initialLogs, initialError }: Props) {
  const [logs] = useState<ActivityLog[]>(initialLogs)
  const [error] = useState(initialError)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      role_update: 'Role Updated',
      user_create: 'User Created',
      user_delete: 'User Deleted',
      profile_update: 'Profile Updated'
    }
    return labels[actionType] || actionType
  }

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      role_update: 'bg-blue-100 text-blue-700',
      user_create: 'bg-green-100 text-green-700',
      user_delete: 'bg-red-100 text-red-700',
      profile_update: 'bg-amber-100 text-amber-700'
    }
    return colors[actionType] || 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
        <p className="text-sm text-slate-600 mt-1">
          {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {logs.length === 0 && !error && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-600">No activity logs yet.</p>
        </div>
      )}

      {/* Logs List - Desktop */}
      {logs.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Admin User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Affected User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {log.admin?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">{log.admin?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                          log.action_type
                        )}`}
                      >
                        {getActionLabel(log.action_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.affected ? (
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {log.affected.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">{log.affected.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.details ? (
                        <pre className="text-xs text-slate-600 max-w-xs overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Logs List - Mobile */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                      log.action_type
                    )}`}
                  >
                    {getActionLabel(log.action_type)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} />
                    {formatDate(log.created_at)}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-600 text-xs">Admin</p>
                    <p className="font-medium text-slate-900">
                      {log.admin?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500">{log.admin?.email}</p>
                  </div>
                  {log.affected && (
                    <div>
                      <p className="text-slate-600 text-xs">Affected User</p>
                      <p className="font-medium text-slate-900">{log.affected.full_name}</p>
                      <p className="text-xs text-slate-500">{log.affected.email}</p>
                    </div>
                  )}
                  {log.details && (
                    <div>
                      <p className="text-slate-600 text-xs">Details</p>
                      <pre className="text-xs text-slate-600 mt-1 overflow-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
