import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value) || 0,
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saldo, setSaldo] = useState(0)
  const [animais, setAnimais] = useState(0)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')

      const [caixaRes, lotesRes] = await Promise.all([
        supabase.from('fluxo_caixa').select('valor, categoria'),
        supabase.from('lotes_animais').select('quantidade'),
      ])

      if (!ativo) return

      if (caixaRes.error || lotesRes.error) {
        setError(caixaRes.error?.message || lotesRes.error?.message || 'Erro ao carregar dados.')
        setLoading(false)
        return
      }

      const totalSaldo = (caixaRes.data || []).reduce((acc, row) => {
        const valor = Number(row.valor) || 0
        const categoria = String(row.categoria || '').toLowerCase()
        return acc + (categoria.includes('ent') ? valor : -valor)
      }, 0)

      const totalAnimais = (lotesRes.data || []).reduce(
        (acc, row) => acc + (Number(row.quantidade) || 0),
        0,
      )

      setSaldo(totalSaldo)
      setAnimais(totalAnimais)
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  return (
    <>
      <div className="card-container">
        <div className="glass-card">
          <div className="card-title">Saldo Integrado</div>
          <div className="card-value">{loading ? 'Carregando...' : brl(saldo)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Animais Ativos</div>
          <div className="card-value">{loading ? 'Carregando...' : animais}</div>
        </div>
      </div>
      {error && <div className="status-msg erro">{error}</div>}
    </>
  )
}
