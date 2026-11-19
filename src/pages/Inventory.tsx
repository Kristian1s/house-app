import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useInventory } from '../hooks/useInventory'
import AddInventoryModal from '../components/AddInventoryModal'
import type { InventoryItem } from '../types'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtPrice(n: number) {
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' kr'
}

function warrantyDays(end: string) {
  return Math.round((new Date(end).getTime() - Date.now()) / 86400000)
}

function WarrantyBadge({ end }: { end: string }) {
  const days = warrantyDays(end)
  const expired = days < 0
  const color = expired || days < 30 ? '#f85149' : days < 180 ? '#d29922' : '#3fb950'
  const bg = expired || days < 30 ? 'rgba(248,81,73,0.1)' : days < 180 ? 'rgba(210,153,34,0.1)' : 'rgba(63,185,80,0.1)'
  const label = expired ? `Utløpt ${fmtDate(end)}` : `Garanti til ${fmtDate(end)}`
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: bg, color, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function sortItems(items: InventoryItem[]): InventoryItem[] {
  const withWarranty = items.filter(i => i.warrantyEnd).sort((a, b) =>
    new Date(a.warrantyEnd!).getTime() - new Date(b.warrantyEnd!).getTime()
  )
  const withoutWarranty = items.filter(i => !i.warrantyEnd)
  return [...withWarranty, ...withoutWarranty]
}

export default function Inventory() {
  const { user } = useAuth()
  const { items, loading, addItem, deleteItem } = useInventory()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  if (!user) return null

  const expiringSoon = items.filter(i => {
    if (!i.warrantyEnd) return false
    const days = warrantyDays(i.warrantyEnd)
    return days >= 0 && days <= 90
  })

  const filtered = sortItems(
    search.trim()
      ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.brand?.toLowerCase().includes(search.toLowerCase()))
      : items
  )

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Inventar</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}
        >
          + Legg til
        </button>
      </div>

      {/* Warranty alert */}
      {expiringSoon.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.3)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#d29922', marginBottom: 4 }}>
            Garanti utløper snart
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-h)' }}>
            {expiringSoon.map(i => (
              <span key={i.id} style={{ marginRight: 12 }}>
                {i.name}{i.warrantyEnd ? ` — ${fmtDate(i.warrantyEnd)}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      {items.length > 4 && (
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Søk på navn eller merke…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-h)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)' }}
          />
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laster…</p>
      ) : filtered.length === 0 && items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Ingen ting registrert enda. Legg til hvitevarer, elektronikk og andre ting du vil ha oversikt over.
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}
          >
            + Legg til første objekt
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Ingen treff for "{search}".</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtered.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              last={i === filtered.length - 1}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddInventoryModal
          currentUserUid={user.uid}
          onAdd={addItem}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function ItemRow({ item, last, onDelete }: { item: InventoryItem; last: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{item.name}</span>
            {item.brand && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.brand}{item.model ? ` · ${item.model}` : ''}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {item.purchaseDate && <span>{fmtDate(item.purchaseDate)}</span>}
            {item.store && <span>· {item.store}</span>}
            {item.price && <span>· {fmtPrice(item.price)}</span>}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item.warrantyEnd && <WarrantyBadge end={item.warrantyEnd} />}
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▴' : '▾'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {item.serialNumber && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>Serienummer: </span>{item.serialNumber}
            </div>
          )}
          {item.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.notes}</div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {item.receiptUrl && (
              <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--accent-border)', background: 'var(--accent-bg)' }}>
                Kvittering
              </a>
            )}
            {item.manualUrl && (
              <a href={item.manualUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--accent-border)', background: 'var(--accent-bg)' }}>
                Bruksanvisning
              </a>
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              style={{ fontSize: 12, color: '#f85149', background: 'none', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--sans)', marginLeft: 'auto' }}
            >
              Slett
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
