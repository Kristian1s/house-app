import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { HouseBudget } from '../types'

const DEFAULT: HouseBudget = { fellesLimit: 10000, personligLimit: 5000 }

export function useBudget(uid: string | null) {
  const [budget, setBudget] = useState<HouseBudget>(DEFAULT)

  useEffect(() => {
    if (!uid) return
    return onSnapshot(doc(db, 'house', 'main', 'budget', 'current'), (snap) => {
      if (snap.exists()) setBudget(snap.data() as HouseBudget)
    })
  }, [uid])

  async function updateBudget(next: Partial<HouseBudget>) {
    await setDoc(doc(db, 'house', 'main', 'budget', 'current'), { ...budget, ...next })
  }

  return { budget, updateBudget }
}
