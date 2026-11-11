import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const FUNCTIONS_BASE = 'https://europe-west1-leiteveien-d99b9.cloudfunctions.net'

export default function GmailCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
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
      setError('Google tilgang ble avvist.')
      return
    }

    fetch(`${FUNCTIONS_BASE}/exchangeGmailToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, uid: user.uid }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token exchange failed')
        navigate('/expenses')
      })
      .catch(() => setError('Noe gikk galt. Prøv igjen.'))
  }, [user, loading, navigate])

  if (error) {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/expenses')}>Tilbake</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
      <p>Kobler til Gmail...</p>
    </div>
  )
}
