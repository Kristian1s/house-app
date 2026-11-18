import { useState, useRef } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'
import { HOUSE_CATEGORIES } from '../types'
import type { HouseCategory, HouseExpense } from '../types'

const PAYERS = ['Kristian', 'Kristine'] as const

interface Props {
  currentUserName: string
  currentUserUid: string
  onAdd: (data: Omit<HouseExpense, 'id'>) => Promise<void>
  onClose: () => void
}

export default function AddExpenseModal({ currentUserName, currentUserUid, onAdd, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<HouseCategory>(HOUSE_CATEGORIES[0])
  const [paidBy, setPaidBy] = useState(currentUserName)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    if (f.type !== 'application/pdf') {
      alert('Kun PDF-filer er tillatt.')
      e.target.value = ''
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      alert('Filen er for stor. Maks 15 MB.')
      e.target.value = ''
      return
    }
    setFile(f)
  }

  async function uploadPdf(): Promise<{ path: string; url: string }> {
    if (!file) throw new Error('Ingen fil valgt')
    const path = `expenses/${currentUserUid}/${Date.now()}_${file.name}`
    const storageRef = ref(storage, path)
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file)
      task.on(
        'state_changed',
        snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve({ path, url })
        },
      )
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) { alert('Last opp en PDF-kvittering.'); return }
    const parsed = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    try {
      const { path, url } = await uploadPdf()
      await onAdd({
        amount: parsed,
        paidBy,
        category,
        date,
        description: description.trim() || undefined,
        pdfPath: path,
        pdfUrl: url,
        createdBy: currentUserUid,
        createdAt: new Date().toISOString(),
      })
      onClose()
    } catch {
      alert('Noe gikk galt. Prøv igjen.')
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--code-bg)',
    color: 'var(--text-h)', fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', border: '1px solid var(--border)', borderRadius: 7,
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface, #1a1d27)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Legg til utgift</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Beløp (kr) *</label>
            <input
              style={field}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Kategori *</label>
            <select style={field} value={category} onChange={e => setCategory(e.target.value as HouseCategory)} required>
              {HOUSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Hvem betalte? *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PAYERS.map(name => (
                <button key={name} type="button" style={segBtn(paidBy === name)} onClick={() => setPaidBy(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Dato</label>
            <input style={field} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Beskrivelse (valgfritt)</label>
            <input
              style={field}
              type="text"
              placeholder="Kort beskrivelse"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Kvittering / faktura (PDF) *</label>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ padding: '7px 12px', borderRadius: 7, border: `1px dashed ${file ? 'var(--accent)' : 'var(--border)'}`, background: 'transparent', color: file ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left' }}
            >
              {file ? `📄 ${file.name}` : '📎 Velg PDF'}
            </button>
            {uploadProgress !== null && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Laster opp… {uploadProgress}%</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving
                ? uploadProgress !== null ? `Laster opp ${uploadProgress}%…` : 'Lagrer…'
                : 'Legg til'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
