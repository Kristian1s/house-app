import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { RenovationExpense } from '../types'

export function useRenovationExpenses() {
  const [expenses, setExpenses] = useState<RenovationExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'house', 'main', 'renovation_expenses'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as RenovationExpense)))
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  async function addExpense(data: Omit<RenovationExpense, 'id'>) {
    await addDoc(collection(db, 'house', 'main', 'renovation_expenses'), data)
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(db, 'house', 'main', 'renovation_expenses', id))
  }

  return { expenses, loading, addExpense, deleteExpense }
}
