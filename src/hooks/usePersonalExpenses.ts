import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { ManualExpense } from '../types'

export function usePersonalExpenses(uid: string | undefined) {
  const [expenses, setExpenses] = useState<ManualExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    const q = query(collection(db, 'users', uid, 'expenses'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualExpense)))
      setLoading(false)
    })
  }, [uid])

  async function addExpense(data: Omit<ManualExpense, 'id' | 'createdAt'>) {
    if (!uid) return
    await addDoc(collection(db, 'users', uid, 'expenses'), {
      ...data,
      createdAt: new Date().toISOString(),
    })
  }

  async function deleteExpense(id: string) {
    if (!uid) return
    await deleteDoc(doc(db, 'users', uid, 'expenses', id))
  }

  return { expenses, loading, addExpense, deleteExpense }
}
