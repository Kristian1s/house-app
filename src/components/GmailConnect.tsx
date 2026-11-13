import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const FUNCTIONS_BASE = 'https://europe-west1-leiteveien-d99b9.cloudfunctions.net'

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/gmail-callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

interface Props {
  connected: boolean
}

export default function GmailConnect({ connected }: Props) {
  const { user } = useAuth()
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    if (!user) return
    setDisconnecting(true)
    await fetch(`${FUNCTIONS_BASE}/disconnectGmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid }),
    })
    setDisconnecting(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      borderRadius: 10,
      border: `1px solid ${connected ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
      background: connected ? 'rgba(34,197,94,0.07)' : 'var(--code-bg)',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill={connected ? '#22c55e' : '#9ca3af'} opacity=".25"/>
        <path d="M22 6l-10 7L2 6" stroke={connected ? '#22c55e' : '#9ca3af'} strokeWidth="2" strokeLinecap="round"/>
      </svg>

      {connected ? (
        <>
          <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 500 }}>Gmail tilkoblet</span>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={{
              fontSize: 13,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(34,197,94,0.4)',
              background: 'transparent',
              color: '#16a34a',
              cursor: 'pointer',
              opacity: disconnecting ? 0.5 : 1,
            }}
          >
            {disconnecting ? 'Kobler fra…' : 'Koble fra'}
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>Gmail ikke tilkoblet</span>
          <a href={buildAuthUrl()} style={{ textDecoration: 'none' }}>
            <button style={{
              fontSize: 13,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--accent-border)',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 500,
            }}>
              Koble til
            </button>
          </a>
        </>
      )}
    </div>
  )
}
