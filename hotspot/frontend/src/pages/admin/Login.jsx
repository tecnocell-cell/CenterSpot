import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      const data = await res.json()

      if (res.ok) {
        login(data.token, data.user, data.empresas, data.permissoes)
        const slug = data.user?.empresa_slug || 'default'
        navigate(`/admin/${slug}`)
      } else {
        setErro(data.error || data.message || 'Erro ao fazer login')
      }
    } catch {
      setErro('Erro de conexão com o servidor')
    }
  }

  return (
    <div className="rn-login-page">
      <form onSubmit={handleLogin} className="rn-login-card">
        <div className="rn-login-brand">
          <h1 style={{ fontSize: '1.5rem' }}>CenterSpot</h1>
          <p>Hotspot &amp; WhatsApp · captive portal · RADIUS</p>
          <span className="rn-login-badge">
            <Wifi size={12} />
            Plataforma multi-tenant
          </span>
        </div>

        {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}

        <div className="rn-field" style={{ marginBottom: '1rem' }}>
          <label className="rn-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rn-input"
            required
            autoComplete="email"
          />
        </div>

        <div className="rn-field" style={{ marginBottom: '1.25rem' }}>
          <label className="rn-label" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rn-input"
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="rn-btn rn-btn--primary" style={{ width: '100%', height: '2.5rem' }}>
          Entrar
        </button>
      </form>
    </div>
  )
}
