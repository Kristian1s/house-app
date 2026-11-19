import type { User } from 'firebase/auth'

export function nameFromUser(user: User): string {
  if (user.displayName) return user.displayName
  return user.email === 'kristiansatree@gmail.com' ? 'Kristian' : 'Kristine'
}

export const HOUSE_CATEGORIES = [
  'Boliglån',
  'Strøm',
  'Nettleie',
  'Vann og kommunale avgifter',
  'Internett og TV',
  'Forsikring',
  'Renovering',
  'Vedlikehold',
  'Utstyr',
] as const

export type HouseCategory = (typeof HOUSE_CATEGORIES)[number]

export const RECURRING_CATEGORIES: HouseCategory[] = [
  'Boliglån',
  'Strøm',
  'Nettleie',
  'Vann og kommunale avgifter',
  'Internett og TV',
  'Forsikring',
]

export interface HouseExpense {
  id: string
  amount: number
  paidBy: string        // display name: 'Kristian' or 'Kristine'
  category: HouseCategory
  date: string          // YYYY-MM-DD
  description?: string
  pdfPath: string
  pdfUrl: string
  createdBy: string     // uid
  createdAt: any
}

export interface HouseMember {
  uid: string
  name: string
  email: string
}

export const RENOVATION_CATEGORIES = ['Materialer', 'Arbeid', 'Leie', 'Annet'] as const
export type RenovationCategory = (typeof RENOVATION_CATEGORIES)[number]

export interface RenovationProject {
  id: string
  name: string
  budget?: number
  startDate?: string
  endDate?: string
  status: 'planned' | 'active' | 'done'
  description?: string
  createdAt?: any
}

export interface RenovationExpense {
  id: string
  projectId: string
  amount: number
  description: string
  date: string
  paidBy: string
  category: RenovationCategory
  contractor?: { name: string; contact?: string; phone?: string; email?: string }
  warrantyEnd?: string
  receiptUrl?: string
  receiptPath?: string
  createdBy: string
  createdAt: any
}

export interface InventoryItem {
  id: string
  name: string
  brand?: string
  model?: string
  serialNumber?: string
  purchaseDate?: string
  price?: number
  store?: string
  warrantyEnd?: string
  notes?: string
  receiptUrl?: string
  receiptPath?: string
  manualUrl?: string
  createdAt?: any
}

// kept for Phase 2 personal economy
export interface ManualExpense {
  id: string
  title: string
  amount: number
  date: string
  dueDate: string | null
  type: 'recurring' | 'one-time'
  recurrence: 'monthly' | 'quarterly' | 'yearly' | null
  scope: 'felles' | 'personlig'
  paidByUid: string
  paidByName: string
  settled: boolean
  attachmentUrl: string | null
  attachmentName: string | null
  createdAt: any
}

export interface HouseBudget {
  fellesLimit: number
  personligLimit: number
}
