'use client'

/**
 * Panneau assistant repliable — ⌘K pour ouvrir/fermer.
 * Utilise Vercel AI SDK v6 useChat() pour le streaming.
 * Affiche les canvas (generative UI) dans le fil de conversation.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, X, Loader2, Send, Trash2 } from 'lucide-react'

interface Props {
  userId: string
}

const WELCOME_MESSAGE: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [{ type: 'text', text: `Bonjour ! Je suis votre assistant Madarisse. Je peux vous aider à gérer votre école — inscriptions, paiements, reporting et plus encore.\n\nEssayez par exemple :\n• "Quels élèves ont des impayés ?"\n• "Inscris Yassine en 6ème A"\n• "Quel est le taux de recouvrement ce mois ?"` }],
  metadata: undefined,
}

function storageKey(userId: string) {
  return `madarisse_chat_${userId}`
}

function loadMessages(userId: string): UIMessage[] {
  if (typeof window === 'undefined') return [WELCOME_MESSAGE]
  try {
    const saved = localStorage.getItem(storageKey(userId))
    return saved ? (JSON.parse(saved) as UIMessage[]) : [WELCOME_MESSAGE]
  } catch {
    return [WELCOME_MESSAGE]
  }
}

export function AssistantPanel({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [savedMessages] = useState<UIMessage[]>(() => loadMessages(userId))

  const activeModule = pathname.split('/')[1] || 'dashboard'

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/agent/chat', body: { active_module: activeModule } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: savedMessages,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Persiste les messages dans localStorage (clé isolée par userId)
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(storageKey(userId), JSON.stringify(messages))
    }
  }, [messages, userId])

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage({ text })
  }

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => { localStorage.removeItem(storageKey(userId)); window.location.reload() }}
            className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground"
            title="Effacer la conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 hover:bg-muted transition-colors"
            title="Fermer (⌘K)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg: UIMessage) => {
          const textParts = msg.parts.filter((p) => p.type === 'text')
          const toolParts = msg.parts.filter((p) => p.type === 'tool-invocation')
          const content = textParts.map((p) => (p as { type: 'text'; text: string }).text).join('')

          return (
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
                {content && <MessageContent content={content} />}
                {msg.role === 'assistant' && toolParts.map((tool, i) => (
                  <ActionCanvas key={i} invocation={tool} />
                ))}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs max-w-[85%]">
              ⚠ Erreur : {error.message || 'Impossible de joindre l\'assistant.'}
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
          onChange={(e) => setInput(e.target.value)}
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
 * Rend le contenu d'un message en parsant les liens markdown [texte](url).
 * Les liens internes (/eleves/...) sont rendus avec Next.js Link.
 */
function MessageContent({ content }: { content: string }) {
  const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null

  while ((match = MD_LINK.exec(content)) !== null) {
    if (match.index > last) {
      parts.push(<span key={last}>{content.slice(last, match.index)}</span>)
    }
    const [, text, href] = match
    const isInternal = href.startsWith('/')
    parts.push(
      isInternal
        ? <Link key={match.index} href={href} className="underline font-medium hover:opacity-80">{text}</Link>
        : <a key={match.index} href={href} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80">{text}</a>
    )
    last = match.index + match[0].length
  }

  if (last < content.length) {
    parts.push(<span key={last}>{content.slice(last)}</span>)
  }

  return <p className="whitespace-pre-wrap">{parts.length > 0 ? parts : content}</p>
}

/**
 * Canvas — composant de confirmation d'action HITL.
 * Affiché dans le fil quand l'agent propose une action qui demande validation.
 */
function ActionCanvas({ invocation }: { invocation: any }) {
  const [actionStatus, setActionStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const [loading, setLoading] = useState(false)

  const result = invocation?.toolInvocation?.result ?? invocation?.result
  if (!result?.action_log_id) return null

  if (actionStatus !== 'pending') return (
    <div className={`mt-2 text-xs rounded p-2 ${actionStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
      {actionStatus === 'confirmed' ? '✅ Action exécutée' : '✗ Annulée'}
    </div>
  )

  const preview = result.preview || {}

  const handleConfirm = async () => {
    setLoading(true)
    const res = await fetch('/api/agent/action/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_log_id: result.action_log_id }),
    })
    if (res.ok) setActionStatus('confirmed')
    setLoading(false)
  }

  const handleCancel = async () => {
    setLoading(true)
    await fetch('/api/agent/action/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_log_id: result.action_log_id }),
    })
    setActionStatus('cancelled')
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
