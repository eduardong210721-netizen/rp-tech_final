'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { loginAction } from './actions'

export default function LoginForm({ avisoInicial }: { avisoInicial?: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(avisoInicial ?? null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const resultado = await loginAction({ email, password })
      // Si loginAction tuvo éxito, hizo redirect() y esta línea no se alcanza
      // (redirect() lanza internamente). Si llegamos aquí, falló.
      if (!resultado.ok) setError(resultado.error)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-8 shadow-2xl shadow-ink/20">
        <p className="eyebrow">RP Tech</p>
        <h1 className="mb-7 mt-2 text-heading">Panel de administración</h1>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-ink-soft">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink-muted"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-ink-soft">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-ink-muted"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-action py-3 text-center text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
