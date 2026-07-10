'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Plus, Reply, Mail, MailOpen } from 'lucide-react'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

interface Message {
  id: string
  subject: string
  body: string
  is_read: boolean
  parent_id: string | null
  created_at: string
  from_user_id: string | null
  to_user_id: string | null
  profiles: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function senderName(msg: Message, currentUserId: string): string {
  if (msg.from_user_id === currentUserId) return 'Moi'
  if (msg.profiles) {
    const { first_name, last_name, email } = msg.profiles
    if (first_name || last_name) return [first_name, last_name].filter(Boolean).join(' ')
    if (email) return email
  }
  return 'Inconnu'
}

export function MessagerieClient() {
  const sb = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showNew, setShowNew] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [newForm, setNewForm] = useState({ to_user_id: '', subject: '', body: '' })
  const [sendingNew, setSendingNew] = useState(false)

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
        sb.from('profiles').select('tenant_id').eq('id', data.user.id).maybeSingle()
          .then(({ data: p }) => {
            if (p?.tenant_id) {
              setTenantId(p.tenant_id)
              // Load profiles in same tenant for recipient list
              sb.from('profiles')
                .select('id, first_name, last_name, email')
                .eq('tenant_id', p.tenant_id)
                .neq('id', data.user!.id)
                .then(({ data: ps }) => setProfiles(ps ?? []))
            }
          })
      }
    })
  }, [])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/messages')
    if (res.ok) setMessages(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])

  const selectedMsg = messages.find(m => m.id === selectedId) ?? null

  const handleSelect = async (msg: Message) => {
    setSelectedId(msg.id)
    setReplyBody('')
    // Mark as read if received and unread
    if (!msg.is_read && msg.to_user_id === currentUserId) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, is_read: true }),
      })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    }
  }

  const handleSendNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.subject.trim() || !newForm.body.trim()) {
      toast.error('Sujet et message sont requis')
      return
    }
    setSendingNew(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    setSendingNew(false)
    if (res.ok) {
      toast.success('Message envoyé')
      setNewForm({ to_user_id: '', subject: '', body: '' })
      setShowNew(false)
      loadMessages()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur')
    }
  }

  const handleReply = async () => {
    if (!selectedMsg || !replyBody.trim()) return
    setSendingReply(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_user_id: selectedMsg.from_user_id,
        subject: `Re: ${selectedMsg.subject}`,
        body: replyBody,
        parent_id: selectedMsg.id,
      }),
    })
    setSendingReply(false)
    if (res.ok) {
      toast.success('Réponse envoyée')
      setReplyBody('')
      loadMessages()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur')
    }
  }

  const unreadCount = messages.filter(m => !m.is_read && m.to_user_id === currentUserId).length

  const profileLabel = (p: Profile) => {
    if (p.first_name || p.last_name) return [p.first_name, p.last_name].filter(Boolean).join(' ')
    return p.email ?? p.id
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {unreadCount > 0 && <Badge className="bg-blue-600 text-white">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</Badge>}
          </span>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nouveau message
        </Button>
      </div>

      <div className="flex gap-4 h-[600px]">
        {/* Message list */}
        <div className="w-80 shrink-0 border rounded-xl bg-white overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">Aucun message</p>
          ) : (
            <div className="divide-y">
              {messages.map(msg => {
                const isSelected = msg.id === selectedId
                const isUnread = !msg.is_read && msg.to_user_id === currentUserId
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelect(msg)}
                    className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        {isUnread
                          ? <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                          : <MailOpen className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'text-gray-700'}`}>
                          {senderName(msg, currentUserId ?? '')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${isUnread ? 'font-medium' : 'text-gray-600'}`}>{msg.subject}</p>
                    <p className="text-xs text-gray-400 truncate">{msg.body}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Message detail */}
        <div className="flex-1 border rounded-xl bg-white flex flex-col">
          {!selectedMsg ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Sélectionnez un message
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">{selectedMsg.subject}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  De&nbsp;: <span className="font-medium">{senderName(selectedMsg, currentUserId ?? '')}</span>
                  &nbsp;·&nbsp;{new Date(selectedMsg.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMsg.body}</p>
              </div>
              <div className="p-4 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Reply className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Répondre</span>
                </div>
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="Votre réponse..."
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleReply} disabled={sendingReply || !replyBody.trim()}>
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Envoyer la réponse
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New message dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendNew} className="space-y-4">
            <div className="space-y-1">
              <Label>Destinataire</Label>
              <select
                value={newForm.to_user_id}
                onChange={e => setNewForm(f => ({ ...f, to_user_id: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Diffusion générale (tous)</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{profileLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Sujet *</Label>
              <Input
                value={newForm.subject}
                onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Objet du message"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Message *</Label>
              <textarea
                value={newForm.body}
                onChange={e => setNewForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Votre message..."
                rows={5}
                required
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
              <Button type="submit" disabled={sendingNew}>
                {sendingNew ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Envoyer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
