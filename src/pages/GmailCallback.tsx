import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const FUNCTIONS_BASE = 'https://europe-west1-leiteveien-d99b9.cloudfunctions.net'

export default function GmailCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [errorMsg, setErrorMsg] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (called.current) return
    called.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError || !code) {
      setStatus('error')
      setErrorMsg('Google tilgang ble avvist.')
      return
    }

    fetch(`${FUNCTIONS_BASE}/exchangeGmailToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        uid: user.uid,
        redirectUri: `${window.location.origin}/gmail-callback`,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Token exchange failed')
        }
        setStatus('success')
        setTimeout(() => navigate('/expenses'), 1200)
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err.message || 'Noe gikk galt. Prøv igjen.')
      })
  }, [user, loading, navigate])

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      {status === 'pending' && (
        <>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <p style={{ color: 'var(--text)', fontSize: 15 }}>Kobler til Gmail…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
          <p style={{ color: '#16a34a', fontWeight: 500 }}>Gmail tilkoblet!</p>
          <p style={{ color: 'var(--text)', fontSize: 14, marginTop: 8 }}>Sender deg tilbake…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: 32, marginBottom: 16 }}>❌</div>
          <p style={{ color: '#dc2626', fontWeight: 500 }}>Tilkobling feilet</p>
          <p style={{ color: 'var(--text)', fontSize: 14, marginTop: 8, marginBottom: 20 }}>{errorMsg}</p>
          <button
            onClick={() => navigate('/expenses')}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            Tilbake
          </button>
        </>
      )}
    </div>
  )
}
