import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Activity, CheckCircle } from 'lucide-react'
import type { ActivityRecord, ReminderRecord } from '../../types/models'

interface ActivityChartsProps {
  activities: ActivityRecord[]
  reminders: ReminderRecord[]
}

const COLORS = {
  primary: '#10b981',
  secondary: '#34d399',
  tertiary: '#6ee7b7',
  quaternary: '#a7f3d0',
}

export function ActivityCharts({ activities, reminders }: ActivityChartsProps) {
  // Weekly activity data
  const weeklyData = getWeeklyActivityData(activities)

  // Reminder completion data
  const reminderCompletionData = getReminderCompletionData(reminders)

  // Activity type distribution
  const activityDistribution = getActivityDistribution(activities)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Section Title */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
          <TrendingUp className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Activity Analytics</h3>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-green-100 bg-white p-4 shadow-md shadow-green-900/5"
        >
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" strokeWidth={2} />
            <h4 className="font-semibold text-slate-900">Weekly Activity</h4>
          </div>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #d1fae5',
                    backgroundColor: '#f0fdf4',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="activities"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
              No activity data available
            </div>
          )}
        </motion.div>

        {/* Reminder Completion Chart */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-green-100 bg-white p-4 shadow-md shadow-green-900/5"
        >
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" strokeWidth={2} />
            <h4 className="font-semibold text-slate-900">Reminder Status</h4>
          </div>
          {reminderCompletionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reminderCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reminderCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #d1fae5',
                    backgroundColor: '#f0fdf4',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
              No reminder data available
            </div>
          )}
        </motion.div>

        {/* Activity Type Distribution */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-green-100 bg-white p-4 shadow-md shadow-green-900/5 lg:col-span-2"
        >
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" strokeWidth={2} />
            <h4 className="font-semibold text-slate-900">Activity Breakdown</h4>
          </div>
          {activityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #d1fae5',
                    backgroundColor: '#f0fdf4',
                  }}
                />
                <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
              No activity data available
            </div>
          )}
        </motion.div>
      </div>
    </motion.section>
  )
}

function getWeeklyActivityData(activities: ActivityRecord[]) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  return last7Days.map((date) => {
    const dayActivities = activities.filter((a) => a.date === date)
    return {
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      activities: dayActivities.length,
    }
  })
}

function getReminderCompletionData(reminders: ReminderRecord[]) {
  const completed = reminders.filter((r) => r.status === 'done').length
  const pending = reminders.filter((r) => r.status === 'pending').length

  if (completed === 0 && pending === 0) return []

  return [
    { name: 'Completed', value: completed, color: COLORS.primary },
    { name: 'Pending', value: pending, color: COLORS.quaternary },
  ]
}

function getActivityDistribution(activities: ActivityRecord[]) {
  const distribution: Record<string, number> = {}

  activities.forEach((activity) => {
    distribution[activity.type] = (distribution[activity.type] ?? 0) + 1
  })

  return Object.entries(distribution)
    .map(([type, count]) => ({
      type: capitalizeType(type),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function renderCustomLabel(entry: any) {
  const percent = ((entry.value / (entry.payload.total || 0)) * 100).toFixed(0)
  return `${percent}%`
}

function capitalizeType(type: string): string {
  return type
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
