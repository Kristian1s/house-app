import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { RenovationProject } from '../types'

export function useRenovationProjects() {
  const [projects, setProjects] = useState<RenovationProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'house', 'main', 'renovation_projects'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as RenovationProject)))
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  async function addProject(data: Omit<RenovationProject, 'id'>) {
    await addDoc(collection(db, 'house', 'main', 'renovation_projects'), {
      ...data,
      createdAt: new Date().toISOString(),
    })
  }

  async function updateProject(id: string, data: Partial<Omit<RenovationProject, 'id'>>) {
    await updateDoc(doc(db, 'house', 'main', 'renovation_projects', id), data)
  }

  async function deleteProject(id: string) {
    await deleteDoc(doc(db, 'house', 'main', 'renovation_projects', id))
  }

  return { projects, loading, addProject, updateProject, deleteProject }
}
