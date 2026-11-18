import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { HouseExpense } from '../types'

export function useHouseExpenses() {
  const [expenses, setExpenses] = useState<HouseExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'house', 'main', 'expenses'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as HouseExpense)))
      setLoading(false)
    })
  }, [])

  async function addExpense(data: Omit<HouseExpense, 'id'>) {
    await addDoc(collection(db, 'house', 'main', 'expenses'), data)
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(db, 'house', 'main', 'expenses', id))
  }

  return { expenses, loading, addExpense, deleteExpense }
}
