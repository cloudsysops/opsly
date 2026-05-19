'use client'

import { useEffect, useState } from 'react'
import { DashboardData } from '@/lib/types'

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) throw new Error('Failed to fetch dashboard')
        const dashboardData: DashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()

    // Set up real-time updates
    const interval = setInterval(fetchDashboard, 2000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome to your Peskids dashboard</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* New Leads Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Leads This Week</h2>
              <span className="text-3xl font-bold text-blue-600">{data.new_leads_count}</span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {data.new_leads.length > 0 ? (
                data.new_leads.map(lead => (
                  <div key={lead.id} className="border-t border-gray-200 pt-3 first:border-t-0 first:pt-0">
                    <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-gray-500">{lead.phone}</p>}
                    <p className="text-xs text-blue-600 mt-1">Grade: {lead.grade_interested}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No new leads this week</p>
              )}
            </div>
          </div>

          {/* Active Students Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Students</h2>
              <span className="text-3xl font-bold text-green-600">{data.active_students_count}</span>
            </div>
            <div className="space-y-2">
              {Object.entries(data.students_by_grade).length > 0 ? (
                Object.entries(data.students_by_grade).map(([grade, count]) => (
                  <div key={grade} className="flex justify-between text-sm">
                    <span className="text-gray-700">Grade {grade}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No active students yet</p>
              )}
            </div>
          </div>

          {/* Parent Feedback Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Feedback</h2>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {data.recent_feedback.length > 0 ? (
                data.recent_feedback.map(fb => (
                  <div key={fb.id} className="border-t border-gray-200 pt-3 first:border-t-0 first:pt-0">
                    <p className="font-medium text-gray-900 text-sm">{fb.child_name}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-500">{'★'.repeat(fb.satisfaction)}</span>
                      <span className="text-gray-400">{'★'.repeat(5 - fb.satisfaction)}</span>
                    </div>
                    {fb.suggestion && (
                      <p className="text-xs text-gray-600 mt-1 italic">&quot;{fb.suggestion}&quot;</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No feedback yet</p>
              )}
            </div>
          </div>

          {/* Pending Follow-ups Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pending Follow-ups</h2>
              <span className="text-3xl font-bold text-red-600">{data.pending_followups_count}</span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {data.pending_followups.length > 0 ? (
                data.pending_followups.map(fu => (
                  <div key={fu.id} className="border-t border-gray-200 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-700 uppercase">{fu.type}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Due: {new Date(fu.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">All caught up!</p>
              )}
            </div>
          </div>

          {/* New Inbound Messages Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Inbound Messages</h2>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {data.recent_messages.length > 0 ? (
                data.recent_messages.map(msg => {
                  const sourceEmoji = msg.source === 'whatsapp' ? '💬' : msg.source === 'instagram' ? '📱' : '💻'
                  const sourceColor = msg.source === 'whatsapp' ? 'bg-green-100 text-green-800' : msg.source === 'instagram' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                  const displayName = msg.sender_name || msg.sender_contact
                  const messagePreview = msg.message_text.length > 40 ? msg.message_text.substring(0, 40) + '...' : msg.message_text
                  const timestamp = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={msg.id} className="border-t border-gray-200 pt-3 first:border-t-0 first:pt-0 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{sourceEmoji}</span>
                            <p className="font-medium text-gray-900 text-sm">{displayName}</p>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sourceColor}`}>
                              {msg.source}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{messagePreview}</p>
                        </div>
                        <p className="text-xs text-gray-400 ml-2">{timestamp}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-gray-500 text-sm">No inbound messages</p>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use Your Dashboard</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>✓ New leads appear in real-time when submitted through the form</li>
            <li>✓ Track parent satisfaction ratings to identify issues early</li>
            <li>✓ Manage follow-ups to ensure no lead is left behind</li>
            <li>✓ Everything is organized by week for easy tracking</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
