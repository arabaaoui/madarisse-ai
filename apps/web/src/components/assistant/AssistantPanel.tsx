'use client'

/**
 * Panneau assistant repliable — ⌘K pour ouvrir/fermer.
 * Utilise Vercel AI SDK useChat() pour le streaming.
 * Affiche les canvas (generative UI) dans le fil de conversation.
 */

import { useState, useEffect, useRef } from 'react'
import { useChat } from 'ai/react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X, Loader2, Send } from 'lucide-react'

interface Props {
  userId: string
}

export function AssistantPanel({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Détermine le module actif depuis l'URL
  const activeModule = pathname.split('/')[1] || 'dashboard'

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/agent/chat',
    body: { active_module: activeModule },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Bonjour ! Je suis votre assistant Madarisse. Je peux vous aider à gérer votre école — inscriptions, paiements, reporting et plus encore.

Essayez par exemple :
• "Quels élèves ont des impayés ?"
• "Inscris Yassine en 6ème A"
• "Quel est le taux de recouvrement ce mois ?"`,
      },
    ],
  })

  // ⌘K / Ctrl+K pour ouvrir/fermer
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        title="Ouvrir l'assistant (⌘K)"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Assistant</span>
        <kbd className="text-xs opacity-70 font-mono">⌘K</kbd>
      </button>
    )
  }

  return (
    <aside className="w-80 border-l bg-card flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Assistant</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 hover:bg-muted transition-colors"
          title="Fermer (⌘K)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] rounded-lg px-3 py-2 text-sm
                ${msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
                }
              `}
            >
              {/* Message texte */}
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Canvas generative UI — rendu si l'assistant propose une action */}
              {/* Les canvas sont injectés via toolInvocations en Phase 1 */}
              {msg.role === 'assistant' && msg.toolInvocations?.map((tool) => (
                <ActionCanvas key={tool.toolCallId} invocation={tool} />
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t flex items-center gap-2"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Posez une question ou déléguez une tâche…"
          disabled={isLoading}
          className="flex-1 text-sm bg-muted rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </aside>
  )
}

/**
 * Canvas — composant de confirmation d'action HITL.
 * Affiché dans le fil quand l'agent propose une action qui demande validation.
 */
function ActionCanvas({ invocation }: { invocation: any }) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const [loading, setLoading] = useState(false)

  if (!invocation.result?.action_log_id) return null
  if (status !== 'pending') return (
    <div className={`mt-2 text-xs rounded p-2 ${status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
      {status === 'confirmed' ? '✅ Action exécutée' : '✗ Annulée'}
    </div>
  )

  const preview = invocation.result.preview || {}

  const handleConfirm = async () => {
    setLoading(true)
    const res = await fetch('/api/agent/action/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_log_id: invocation.result.action_log_id }),
    })
    if (res.ok) setStatus('confirmed')
    setLoading(false)
  }

  const handleCancel = async () => {
    setLoading(true)
    await fetch('/api/agent/action/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_log_id: invocation.result.action_log_id }),
    })
    setStatus('cancelled')
    setLoading(false)
  }

  return (
    <div className="mt-3 rounded-lg border bg-background p-3 space-y-2 text-xs">
      {preview.student_name && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Élève</span>
            <span className="font-medium">{preview.student_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Classe</span>
            <span>{preview.class_name}</span>
          </div>
          {preview.enrollment_fee != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais inscription</span>
              <span>{preview.enrollment_fee.toLocaleString('fr-MA')} MAD</span>
            </div>
          )}
          {preview.tuition_fee != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scolarité/mois</span>
              <span>{preview.tuition_fee.toLocaleString('fr-MA')} MAD</span>
            </div>
          )}
          {preview.estimated_total != null && (
            <div className="flex justify-between font-semibold border-t pt-1 mt-1">
              <span>Total estimé</span>
              <span>{preview.estimated_total.toLocaleString('fr-MA')} MAD</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 py-1.5 rounded border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : '✓ Valider'}
        </button>
      </div>
    </div>
  )
}
