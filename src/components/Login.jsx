import { useState } from 'react'
import { signIn } from '../lib/auth'

import InstallButton from './InstallButton'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMsg('')
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setMsg(
        /invalid login credentials/i.test(error.message)
          ? 'E-mail ou senha incorretos.'
          : error.message,
      )
    }
  }

  return (
    <div className="login-wrap">
      <form className="glass-card login-card" onSubmit={handleSubmit}>
        <div className="brand">🌱 Agro ERP</div>
        <h2>Entrar</h2>
        <p className="muted login-aviso">
          Acesso restrito. Use o e-mail e a senha cadastrados pelo administrador.
        </p>
        <div className="form-group">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-pass">Senha</label>
          <input
            id="login-pass"
            className="form-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {msg && <div className="form-error">{msg}</div>}
        <div className="modal-actions">
          <button type="submit" className="btn-novo" disabled={loading}>
            {loading ? 'Aguarde...' : 'Entrar'}
          </button>
        </div>
        <div className="login-instalar">
          <InstallButton variante="ghost" />
        </div>
      </form>
    </div>
  )
}
