import { useState, useRef } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'
import type { InventoryItem } from '../types'

interface Props {
  currentUserUid: string
  onAdd: (data: Omit<InventoryItem, 'id'>) => Promise<void>
  onClose: () => void
}

export default function AddInventoryModal({ currentUserUid, onAdd, onClose }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [warrantyEnd, setWarrantyEnd] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [notes, setNotes] = useState('')
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
    const path = `inventory/${currentUserUid}/${Date.now()}_${file.name}`
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
    setSaving(true)
    try {
      let receiptUrl: string | undefined
      let receiptPath: string | undefined
      if (file) {
        const result = await uploadPdf()
        receiptUrl = result.url
        receiptPath = result.path
      }
      const parsedPrice = price ? parseFloat(price.replace(',', '.')) : undefined
      await onAdd({
        name: name.trim(),
        ...(brand.trim() && { brand: brand.trim() }),
        ...(model.trim() && { model: model.trim() }),
        ...(serialNumber.trim() && { serialNumber: serialNumber.trim() }),
        ...(purchaseDate && { purchaseDate }),
        ...(parsedPrice && !isNaN(parsedPrice) && { price: parsedPrice }),
        ...(store.trim() && { store: store.trim() }),
        ...(warrantyEnd && { warrantyEnd }),
        ...(manualUrl.trim() && { manualUrl: manualUrl.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        ...(receiptUrl && { receiptUrl, receiptPath }),
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

  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  const section = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '4px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 12, marginTop: 4 }}>
      {title}
    </div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 17 }}>Legg til inventar</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {section('Produkt')}

          <div>
            <label style={lbl}>Navn *</label>
            <input style={field} type="text" placeholder="f.eks. Vaskemaskin" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Merke</label>
              <input style={field} type="text" placeholder="Miele" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Modell</label>
              <input style={field} type="text" placeholder="W1 Classic" value={model} onChange={e => setModel(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>Serienummer</label>
            <input style={field} type="text" placeholder="SN-123456" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
          </div>

          {section('Kjøp')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Kjøpsdato</label>
              <input style={field} type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Pris (kr)</label>
              <input style={field} type="text" inputMode="decimal" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>Butikk / leverandør</label>
            <input style={field} type="text" placeholder="Elkjøp, Komplett…" value={store} onChange={e => setStore(e.target.value)} />
          </div>

          {section('Garanti')}

          <div>
            <label style={lbl}>Garanti utløper</label>
            <input style={field} type="date" value={warrantyEnd} onChange={e => setWarrantyEnd(e.target.value)} />
          </div>

          {section('Dokumenter')}

          <div>
            <label style={lbl}>Kvittering (PDF)</label>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            <button
              type="button" onClick={() => fileRef.current?.click()}
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

          <div>
            <label style={lbl}>Bruksanvisning (URL)</label>
            <input style={field} type="text" placeholder="https://…" value={manualUrl} onChange={e => setManualUrl(e.target.value)} />
          </div>

          <div>
            <label style={lbl}>Notat</label>
            <input style={field} type="text" placeholder="Valgfritt notat" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
