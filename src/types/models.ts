import type { Timestamp } from 'firebase/firestore'

export type AppLanguage = 'en' | 'hi' | 'mr'

export type UserProfile = {
  uid: string
  fullName: string
  phone: string
  email: string

  village: string
  district: string
  state: string

  preferredLanguage: AppLanguage

  latitude?: number
  longitude?: number

  photoURL?: string
  createdAt: Date
}

export type SignUpPayload = {
  fullName: string
  phone: string
  email: string
  password: string

  village: string
  district: string
  state: string

  preferredLanguage: string

  latitude?: number
  longitude?: number
}

export type CropDetectionRecord = {
  id: string
  userId: string
  imageUrl: string
  cropName: string
  confidence: number
  description: string
  createdAt: Date
}

export type ActivityRecord = {
  id: string
  userId: string
  title: string
  type: string
  date: string
  status: 'done' | 'pending'
  notes: string
  createdAt: Date
}

export type ReminderRecord = {
  id: string
  userId: string
  title: string
  description: string
  reminderDate: string
  reminderTime: string
  type: string
  status: 'pending' | 'done'
  createdAt: Date
}

export type ChatHistoryRecord = {
  id: string
  userId: string
  userMessage: string
  aiResponse: string
  language: string
  createdAt: Date
}

export function tsToDate(value: Timestamp | Date | undefined): Date {
  if (!value) return new Date()

  if (typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate()
  }

  return value as Date
}