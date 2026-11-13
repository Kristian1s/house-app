export type UserId = 'kristian' | 'girlfriend'

export interface Expense {
  id: string
  date: string
  vendor: string
  amount: number
  category: ExpenseCategory
  paidBy: UserId
  project?: string
  receiptUrl?: string
  note?: string
  createdAt: string
}

export type ExpenseCategory =
  | 'power'
  | 'internet'
  | 'water'
  | 'insurance'
  | 'loan'
  | 'renovation'
  | 'other'

export interface RecurringBill {
  id: string
  vendor: string
  category: ExpenseCategory
  estimatedAmount: number
  dueDay: number
  active: boolean
}

export interface RenovationProject {
  id: string
  name: string
  budget: number
  startDate?: string
  endDate?: string
  status: 'planned' | 'active' | 'done'
}

export type InvoiceCategory = 'personlig' | 'felles' | null

export interface GmailInvoice {
  id: string
  subject: string
  from: string
  vendor: string
  date: { toDate: () => Date } | Date | string
  dueDate: { toDate: () => Date } | Date | string | null
  snippet: string
  amount: number | null
  invoiceNumber: string | null
  category: InvoiceCategory
  gmailMessageId: string
  createdAt: { toDate: () => Date } | Date | string
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
  receiptUrl?: string
  manualUrl?: string
  projectId?: string
}
