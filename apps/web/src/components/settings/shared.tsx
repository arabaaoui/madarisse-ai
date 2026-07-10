'use client'

import { Loader2 } from 'lucide-react'

export const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#FF7A00] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20'
export const btn = 'inline-flex items-center gap-2 rounded-xl bg-[#02133E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#02133E]/90 disabled:opacity-50 transition-colors'
export const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
export const btnDanger = 'inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors'

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

export function Spinner() {
  return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
}
