import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { GmailInvoice } from '../types'

export function useGmail(uid: string | undefined) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<GmailInvoice[]>([])

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      setConnected(snap.data()?.gmail?.connected === true)
      setLoading(false)
    })

    return unsub
  }, [uid])

  useEffect(() => {
    if (!uid || !connected) {
      setInvoices([])
      return
    }

    const q = query(
      collection(db, 'users', uid, 'invoices'),
      orderBy('date', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      setInvoices(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as GmailInvoice))
          .filter((i) => !(i as any)._deleted)
      )
    })

    return unsub
  }, [uid, connected])

  return { connected, loading, invoices }
}
