import { useState, useRef } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'
import { RENOVATION_CATEGORIES } from '../types'
import type { RenovationCategory, RenovationExpense } from '../types'

const PAYERS = ['Kristian', 'Kristine'] as const

interface Props {
  projectId: string
  currentUserName: string
  currentUserUid: string
  onAdd: (data: Omit<RenovationExpense, 'id'>) => Promise<void>
  onClose: () => void
}

export default function AddRenovationExpenseModal({ projectId, currentUserName, currentUserUid, onAdd, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<RenovationCategory>('Materialer')
  const [paidBy, setPaidBy] = useState(currentUserName)

  const [showContractor, setShowContractor] = useState(false)
  const [firmaNavn, setFirmaNavn] = useState('')
  const [kontakt, setKontakt] = useState('')
  const [telefon, setTelefon] = useState('')
  const [epost, setEpost] = useState('')

  const [showWarranty, setShowWarranty] = useState(false)
  const [warrantyEnd, setWarrantyEnd] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    if (f.type !== 'application/pdf') { alert('Kun PDF-filer er tillatt.'); e.target.value = ''; return }
    if (f.size > 15 * 1024 * 1024) { alert('Filen er for stor. Maks 15 MB.'); e.target.value = ''; return }
    setFile(f)
  }

  async function uploadPdf(): Promise<{ path: string; url: string }> {
    if (!file) throw new Error('Ingen fil valgt')
    const path = `renovation/${currentUserUid}/${Date.now()}_${file.name}`
    const storageRef = ref(storage, path)
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, { contentType: 'application/pdf' })
      task.on('state_changed',
        snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => { const url = await getDownloadURL(task.snapshot.ref); resolve({ path, url }) },
      )
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    try {
      let receiptUrl: string | undefined
      let receiptPath: string | undefined
      if (file) {
        const result = await uploadPdf()
        receiptUrl = result.url
        receiptPath = result.path
      }

      const contractor = showContractor && firmaNavn.trim()
        ? {
            name: firmaNavn.trim(),
            ...(kontakt.trim() && { contact: kontakt.trim() }),
            ...(telefon.trim() && { phone: telefon.trim() }),
            ...(epost.trim() && { email: epost.trim() }),
          }
        : undefined

      await onAdd({
        projectId,
        amount: parsed,
        description: description.trim(),
        date,
        category,
        paidBy,
        ...(contractor && { contractor }),
        ...(showWarranty && warrantyEnd && { warrantyEnd }),
        ...(receiptUrl && { receiptUrl, receiptPath }),
        createdBy: currentUserUid,
        createdAt: new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      alert('Feil: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 14, boxSizing: 'border-box', outline: 'none',
    fontFamily: 'var(--sans)',
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '6px 0', border: '1px solid var(--border)', borderRadius: 7,
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
    fontFamily: 'var(--sans)',
  })

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
    border: '1px solid var(--border)',
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400, fontFamily: 'var(--sans)',
  })

  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  const toggleBtn: React.CSSProperties = {
    background: 'none', border: '1px solid var(--border)', borderRadius: 7,
    padding: '5px 12px', color: 'var(--text-muted)', cursor: 'pointer',
    fontSize: 12, fontFamily: 'var(--sans)', textAlign: 'left', width: '100%',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 17 }}>Legg til utgift</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Beløp (kr) *</label>
              <input style={field} type="text" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>Dato *</label>
              <input style={field} type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={lbl}>Beskrivelse *</label>
            <input style={field} type="text" placeholder="Hva ble kjøpt / gjort" value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <div>
            <label style={lbl}>Kategori *</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {RENOVATION_CATEGORIES.map(c => (
                <button key={c} type="button" style={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>Betalt av *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PAYERS.map(name => (
                <button key={name} type="button" style={segBtn(paidBy === name)} onClick={() => setPaidBy(name)}>{name}</button>
              ))}
            </div>
          </div>

          {/* Contractor section */}
          <div>
            <button type="button" style={toggleBtn} onClick={() => setShowContractor(v => !v)}>
              {showContractor ? '▾' : '▸'} Firmainformasjon {showContractor ? '' : '(valgfritt)'}
            </button>
            {showContractor && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <label style={lbl}>Firma</label>
                  <input style={field} type="text" placeholder="Firmanavn" value={firmaNavn} onChange={e => setFirmaNavn(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Kontaktperson</label>
                    <input style={field} type="text" placeholder="Navn" value={kontakt} onChange={e => setKontakt(e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Telefon</label>
                    <input style={field} type="tel" placeholder="+47 …" value={telefon} onChange={e => setTelefon(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>E-post</label>
                  <input style={field} type="text" placeholder="firma@epost.no" value={epost} onChange={e => setEpost(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Warranty section */}
          <div>
            <button type="button" style={toggleBtn} onClick={() => setShowWarranty(v => !v)}>
              {showWarranty ? '▾' : '▸'} Garanti {showWarranty ? '' : '(valgfritt)'}
            </button>
            {showWarranty && (
              <div style={{ marginTop: 10, padding: '12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={lbl}>Garantidato (utløper)</label>
                <input style={field} type="date" value={warrantyEnd} onChange={e => setWarrantyEnd(e.target.value)} />
              </div>
            )}
          </div>

          {/* Receipt upload */}
          <div>
            <label style={lbl}>Kvittering / faktura (PDF)</label>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ padding: '7px 12px', borderRadius: 7, border: `1px dashed ${file ? 'var(--accent)' : 'var(--border)'}`, background: 'transparent', color: file ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left', fontFamily: 'var(--sans)' }}
            >
              {file ? file.name : 'Velg PDF (valgfritt)'}
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
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >
              Avbryt
            </button>
            <button
              type="submit" disabled={saving}
              style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'var(--sans)' }}
            >
              {saving ? (uploadProgress !== null ? `Laster opp ${uploadProgress}%…` : 'Lagrer…') : 'Legg til'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
