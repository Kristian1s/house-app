import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { InventoryItem } from '../types'

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'house', 'main', 'inventory'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)))
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  async function addItem(data: Omit<InventoryItem, 'id'>) {
    await addDoc(collection(db, 'house', 'main', 'inventory'), {
      ...data,
      createdAt: new Date().toISOString(),
    })
  }

  async function deleteItem(id: string) {
    await deleteDoc(doc(db, 'house', 'main', 'inventory', id))
  }

  return { items, loading, addItem, deleteItem }
}
