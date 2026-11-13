import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { ManualExpense } from '../types'

export function useFellesExpenses() {
  const [expenses, setExpenses] = useState<ManualExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'house', 'main', 'expenses'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualExpense)))
      setLoading(false)
    })
  }, [])

  async function addExpense(data: Omit<ManualExpense, 'id' | 'createdAt'>) {
    await addDoc(collection(db, 'house', 'main', 'expenses'), {
      ...data,
      createdAt: new Date().toISOString(),
    })
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(db, 'house', 'main', 'expenses', id))
  }

  async function settleAll() {
    const batch = writeBatch(db)
    expenses.filter(e => !e.settled).forEach(e => {
      batch.update(doc(db, 'house', 'main', 'expenses', e.id), { settled: true })
    })
    await batch.commit()
  }

  async function toggleSettled(id: string, current: boolean) {
    await updateDoc(doc(db, 'house', 'main', 'expenses', id), { settled: !current })
  }

  return { expenses, loading, addExpense, deleteExpense, settleAll, toggleSettled }
}
