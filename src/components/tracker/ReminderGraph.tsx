/**
 * ReminderGraph.tsx
 * Simple weekly reminder completion bar chart using Recharts.
 * Shows completed vs pending reminders for the last 7 days.
 */
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import type { ReminderRecord } from '../../types/models'

interface ReminderGraphProps {
  reminders: ReminderRecord[]
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

function buildWeeklyData(reminders: ReminderRecord[]) {
  const days = getLast7Days()
  return days.map((date) => {
    const dayReminders = reminders.filter((r) => r.reminderDate === date)
    return {
      day: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }),
      date,
      completed: dayReminders.filter((r) => r.status === 'done').length,
      pending: dayReminders.filter((r) => r.status === 'pending').length,
    }
  })
}

// Summary stats
function getStats(reminders: ReminderRecord[]) {
  const total = reminders.length
  const done = reminders.filter((r) => r.status === 'done').length
  const pending = reminders.filter((r) => r.status === 'pending').length
  const rate = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, pending, rate }
}

export function ReminderGraph({ reminders }: ReminderGraphProps) {
  const data = buildWeeklyData(reminders)
  const stats = getStats(reminders)
  const hasData = reminders.length > 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
          <BarChart2 className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Weekly Overview</h3>
          <p className="text-xs text-slate-500">Reminder completion rate this week</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
          { label: 'Completed', value: stats.done, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex flex-col items-center justify-center rounded-2xl border py-3 ${item.bg} ${item.border}`}
          >
            <span className={`text-2xl font-black ${item.color}`}>{item.value}</span>
            <span className="text-xs font-medium text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Completion rate pill */}
      {hasData && (
        <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">Completion Rate</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.rate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
              />
            </div>
            <span className="text-sm font-bold text-green-700">{stats.rate}%</span>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-600">Last 7 Days</p>
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #d1fae5',
                  backgroundColor: '#f0fdf4',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="pending"
                name="Pending"
                fill="#fbbf24"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
            <BarChart2 className="h-8 w-8 text-slate-200" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">Add reminders to see your weekly progress</p>
          </div>
        )}
      </div>
    </motion.section>
  )
}
