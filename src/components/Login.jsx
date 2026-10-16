import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'

export default function Login() {
  const [mode, setMode] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMsg('')
    const { error } =
      mode === 'entrar' ? await signIn(email, password) : await signUp(email, password)
    setLoading(false)
    if (error) {
      setMsg(error.message)
      return
    }
    if (mode === 'criar') {
      setMsg('Conta criada! Se pedir confirmação por e-mail, confirme e depois entre.')
      setMode('entrar')
    }
  }

  return (
    <div className="login-wrap">
      <form className="glass-card login-card" onSubmit={handleSubmit}>
        <div className="brand">🌱 Agro ERP</div>
        <h2>{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</h2>
        <div className="form-group">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="form-input"
            type="email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {msg && <div className="muted">{msg}</div>}
        <div className="modal-actions">
          <button type="submit" className="btn-novo" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === 'entrar' ? 'criar' : 'entrar')
            setMsg('')
          }}
        >
          {mode === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  )
}
