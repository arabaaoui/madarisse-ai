'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message ?? 'Connexion échouée')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-[#02133E] px-16">
        <Image src="/logo.svg" alt="Madarisse AI" width={96} height={96} priority />
        <h1 className="mt-8 text-4xl font-bold text-white tracking-tight">
          Madarisse<span className="text-[#FF7A00]">.ai</span>
        </h1>
        <p className="mt-3 text-lg text-white/70 text-center max-w-sm">
          La plateforme de gestion scolaire agentique pour les écoles marocaines.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
          {[
            { label: 'Inscriptions', icon: '📋' },
            { label: 'Paiements',    icon: '💳' },
            { label: 'Élèves',       icon: '👥' },
            { label: 'Reporting',    icon: '📊' },
          ].map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Image src="/logo.svg" alt="Madarisse AI" width={64} height={64} />
            <h1 className="mt-4 text-2xl font-bold text-[#02133E]">
              Madarisse<span className="text-[#FF7A00]">.ai</span>
            </h1>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-gray-900">Connexion</h2>
          <p className="mb-6 text-sm text-gray-500">Accédez à votre espace de gestion</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Adresse e-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm
                           focus:border-[#FF7A00] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20"
                placeholder="directeur@ecole.ma"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm
                           focus:border-[#FF7A00] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9500] py-2.5
                         text-sm font-semibold text-white shadow-sm
                         hover:scale-[1.01] hover:shadow-md transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            madarisse.ai — Plateforme de gestion scolaire
          </p>
        </div>
      </div>
    </div>
  )
}
