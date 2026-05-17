import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { ActivityRecord } from '../../types/models'

interface ActivityHistoryProps {
  activities: ActivityRecord[]
  loading: boolean
  onEdit: (activity: ActivityRecord) => void
  onDelete: (id: string) => void
}

const activityTypeIcons: Record<string, string> = {
  'crop scan': '📸',
  'ai chat': '🤖',
  'weather check': '⛅',
  'reminder completed': '✅',
  'irrigation': '💧',
  'fertilizer': '🌾',
  'pesticide spray': '🛡️',
  'harvest': '🌾',
  'soil test': '🔬',
  'pruning': '✂️',
  'weeding': '🌱',
  'other': '📝',
}

export function ActivityHistory({ activities, loading, onEdit, onDelete }: ActivityHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Get unique activity types
  const activityTypes = useMemo(() => {
    const types = new Set(activities.map((a) => a.type))
    return Array.from(types).sort()
  }, [activities])

  // Filter and search activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesSearch =
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.notes.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = !selectedType || activity.type === selectedType

      return matchesSearch && matchesType
    })
  }, [activities, searchQuery, selectedType])

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityRecord[]> = {}

    filteredActivities.forEach((activity) => {
      if (!groups[activity.date]) {
        groups[activity.date] = []
      }
      groups[activity.date].push(activity)
    })

    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, items }))
  }, [filteredActivities])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Activity History</h3>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-full p-2 text-slate-600 transition hover:scale-105 hover:bg-green-50 hover:text-green-700"
        >
          <Filter className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="w-full rounded-2xl border border-green-100 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filter Tags */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedType === null
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Activities
              </button>
              {activityTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedType === type
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="mr-2">{activityTypeIcons[type] || '📝'}</span>
                  {capitalizeType(type)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center"
        >
          <div className="mb-3 text-4xl">🌱</div>
          <p className="text-sm font-semibold text-slate-700">
            {searchQuery || selectedType
              ? 'No activities match your search'
              : 'No activities logged yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Start logging activities to track your farming progress
          </p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          {groupedActivities.map((group) => (
            <div key={group.date}>
              {/* Date Header */}
              <motion.p
                variants={itemVariants}
                className="px-1 text-xs font-bold uppercase text-slate-500"
              >
                {formatDateHeader(group.date)}
              </motion.p>

              {/* Activity Cards */}
              <motion.div variants={containerVariants} className="mt-2 space-y-2">
                {group.items.map((activity) => (
                  <motion.div
                    key={activity.id}
                    variants={itemVariants}
                    className="group rounded-2xl border border-green-100 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-green-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{activityTypeIcons[activity.type] || '📝'}</span>
                          <h4 className="font-semibold text-slate-900">{activity.title}</h4>
                        </div>
                        {activity.notes && (
                          <p className="mt-1 text-sm text-slate-600">{activity.notes}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                              activity.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {activity.status === 'done' ? (
                              <CheckCircle className="h-4 w-4" strokeWidth={2} />
                            ) : (
                              <Clock className="h-4 w-4" strokeWidth={2} />
                            )}
                            {activity.status === 'done' ? 'Completed' : 'Pending'}
                          </span>
                          <span className="text-xs text-slate-500">{activity.date}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEdit(activity)}
                          className="rounded-full p-2 text-green-700 transition hover:scale-105 hover:bg-green-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(activity.id)}
                          className="rounded-full p-2 text-red-700 transition hover:scale-105 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Result Counter */}
      {filteredActivities.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-slate-500"
        >
          Showing {filteredActivities.length} of {activities.length} activities
        </motion.p>
      )}
    </motion.section>
  )
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today'
  }
  if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function capitalizeType(type: string): string {
  return type
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
