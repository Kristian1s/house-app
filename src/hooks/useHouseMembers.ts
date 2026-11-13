import { useEffect, useState } from 'react'
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { User } from 'firebase/auth'
import type { HouseMember } from '../types'

export function useHouseMembers(user: User | null) {
  const [members, setMembers] = useState<HouseMember[]>([])

  useEffect(() => {
    if (!user) return
    // Register current user as a house member
    setDoc(doc(db, 'house', 'main', 'members', user.uid), {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Ukjent',
      email: user.email || '',
    } satisfies HouseMember, { merge: true })
  }, [user])

  useEffect(() => {
    return onSnapshot(collection(db, 'house', 'main', 'members'), (snap) => {
      setMembers(snap.docs.map(d => d.data() as HouseMember))
    })
  }, [])

  return members
}
