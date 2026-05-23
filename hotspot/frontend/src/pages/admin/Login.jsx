import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Wifi } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'

function randomChallenge() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a + b }
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { branding } = useBranding()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [challenge, setChallenge] = useState(randomChallenge)
  const [erro, setErro] = useState(null)
  const [captchaHelp, setCaptchaHelp] = useState(false)

  const refreshCaptcha = useCallback(() => {
    setChallenge(randomChallenge())
    setCaptchaInput('')
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro(null)

    const resposta = parseInt(String(captchaInput).trim(), 10)
    if (!Number.isFinite(resposta) || resposta !== challenge.answer) {
      setErro('Verificação incorreta. Resolva a soma e tente novamente.')
      refreshCaptcha()
      return
    }

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
        refreshCaptcha()
      }
    } catch {
      setErro('Erro de conexão com o servidor')
      refreshCaptcha()
    }
  }

  return (
    <div className="rn-login-page">
      <form onSubmit={handleLogin} className="rn-login-card">
        <div className="rn-login-card__brand">
          <img src={branding.logo_url} alt="CenterSpot" className="rn-login-logo rn-login-logo--color" />
          <p className="rn-login-tagline">Hotspot &amp; WhatsApp · captive portal · RADIUS</p>
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

        <div className="rn-field" style={{ marginBottom: '1rem' }}>
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

        <div className="rn-login-captcha">
          <label className="rn-label" htmlFor="captcha">Verificação</label>
          <div className="rn-login-captcha__row">
            <span className="rn-login-captcha__expr" aria-hidden>
              {challenge.a} + {challenge.b} =
            </span>
            <input
              id="captcha"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ''))}
              className="rn-input rn-login-captcha__input"
              placeholder="resultado"
              required
              autoComplete="off"
            />
            <button
              type="button"
              className="rn-login-captcha__help"
              title="Ajuda"
              aria-label="Ajuda sobre a verificação"
              aria-expanded={captchaHelp}
              onClick={() => setCaptchaHelp((v) => !v)}
            >
              <HelpCircle size={16} />
            </button>
          </div>
          {captchaHelp && (
            <p className="rn-login-captcha__hint">
              Some os dois números e informe o resultado para confirmar que você não é um robô.
            </p>
          )}
        </div>

        <button type="submit" className="rn-btn rn-btn--primary" style={{ width: '100%', height: '2.5rem', marginTop: '0.25rem' }}>
          Entrar
        </button>
      </form>
    </div>
  )
}
