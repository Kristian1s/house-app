import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { HouseExpense } from '../types'

export function useHouseExpenses(uid: string | null) {
  const [expenses, setExpenses] = useState<HouseExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let unsub: (() => void) | undefined
    let retries = 0
    let cancelled = false

    function subscribe() {
      if (cancelled) return
      console.log('[expenses] starting listener, uid:', uid, 'retry:', retries)
      const q = query(collection(db, 'house', 'main', 'expenses'), orderBy('date', 'desc'))
      unsub = onSnapshot(q, (snap) => {
        console.log('[expenses] got', snap.docs.length, 'docs')
        setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as HouseExpense)))
        setLoading(false)
      }, (err) => {
        console.error('[expenses] error code:', err.code, 'message:', err.message, 'uid:', uid, 'retry:', retries)
        if (!cancelled && retries < 3) {
          retries++
          setTimeout(subscribe, 1000)
        } else if (!cancelled) {
          setLoading(false)
        }
      })
    }

    subscribe()
    return () => { cancelled = true; unsub?.() }
  }, [uid])

  async function addExpense(data: Omit<HouseExpense, 'id'>) {
    await addDoc(collection(db, 'house', 'main', 'expenses'), data)
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(db, 'house', 'main', 'expenses', id))
  }

  return { expenses, loading, addExpense, deleteExpense }
}
