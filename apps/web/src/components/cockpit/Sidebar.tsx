'use client'

import Image from 'next/image'
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
  CheckSquare,
  BookMarked,
  GraduationCap,
  CalendarDays,
  MessageSquare,
  Shield,
} from 'lucide-react'

const navSections = [
  {
    items: [
      { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/eleves',       label: 'Élèves',        icon: Users },
      { href: '/inscriptions', label: 'Inscriptions',  icon: ClipboardList },
      { href: '/paiements',    label: 'Paiements',     icon: CreditCard },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/comptabilite', label: 'Comptabilité',  icon: BarChart3 },
      { href: '/reporting',    label: 'Reporting',     icon: FileText },
    ],
  },
  {
    label: 'Vie scolaire',
    items: [
      { href: '/presences',    label: 'Présences',     icon: CheckSquare },
      { href: '/devoirs',      label: 'Devoirs',       icon: BookMarked },
      { href: '/bulletins',    label: 'Bulletins',     icon: GraduationCap },
      { href: '/calendrier',   label: 'Calendrier',    icon: CalendarDays },
      { href: '/messagerie',   label: 'Messagerie',    icon: MessageSquare },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/parametres',   label: 'Paramètres',    icon: Settings },
      { href: '/superadmin',   label: 'Super Admin',   icon: Shield },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-sidebar flex flex-col h-full shrink-0 border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
        <Image src="/logo.svg" alt="Madarisse AI" width={32} height={32} />
        <span className="font-bold text-base tracking-tight text-sidebar-foreground">
          Madarisse<span className="text-sidebar-primary">.ai</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navSections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
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
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/50 shrink-0">
        <p>madarisse.com</p>
      </div>
    </aside>
  )
}
