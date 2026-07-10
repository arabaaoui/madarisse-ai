'use client'

/**
 * Sidebar de navigation — tous les modules du cockpit.
 * Identique à la sidebar de ecole-muret mais portée en Next.js App Router.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/eleves',       label: 'Élèves',        icon: Users },
  { href: '/inscriptions', label: 'Inscriptions',  icon: ClipboardList },
  { href: '/paiements',    label: 'Paiements',     icon: CreditCard },
  { href: '/comptabilite', label: 'Comptabilité',  icon: BarChart3 },
  { href: '/reporting',    label: 'Reporting',     icon: FileText },
  { href: '/parametres',   label: 'Paramètres',    icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-sidebar flex flex-col h-full shrink-0 border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <span className="font-bold text-lg tracking-tight text-sidebar-foreground">
          <span className="text-sidebar-primary">M</span>adarisse AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }
              `}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
        <p>madarisse.com</p>
      </div>
    </aside>
  )
}
