import { CalendarDays, List, Clock, Sun, Moon, Bell, BellOff, BellRing, ChartNoAxesColumn, Settings } from 'lucide-react'
import { AppMark } from './AppMark.jsx'
import { IconButton } from './ui/IconButton.jsx'
import { InstallButton } from './InstallButton.jsx'
import { cn } from '../lib/cn.js'

function StatusDot({ ok, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
      {label}
    </span>
  )
}

// Top bar: brand + status, Month/List switch, utility toggles.
export function Header({ view, onView, theme, onToggleTheme, onOpenStats, onOpenSettings, notif, health }) {
  const notifOn = notif.permission === 'granted' && notif.enabled
  const NotifIcon = notif.permission === 'granted' ? (notif.enabled ? BellRing : Bell) : BellOff

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <AppMark />
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight">Calendar</h1>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
            <StatusDot ok={health.mode === 'notion'} label={health.mode === 'notion' ? 'Notion' : 'Local'} />
            <StatusDot ok={health.aiConfigured} label={health.aiConfigured ? 'Groq on' : 'AI off'} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* View switch */}
        <div className="mr-1 inline-flex rounded-xl border border-zinc-200 bg-white/80 p-0.5 dark:border-white/10 dark:bg-white/5">
          {[
            { id: 'month', icon: CalendarDays, label: 'Month' },
            { id: 'day',   icon: Clock,        label: 'Day'   },
            { id: 'list',  icon: List,         label: 'List'  },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => onView(id)}
              className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ring-focus', view === id ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <IconButton label="Patterns" onClick={onOpenStats}>
          <ChartNoAxesColumn className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label="Settings" onClick={onOpenSettings}>
          <Settings className="h-[18px] w-[18px]" />
        </IconButton>
        {notif.supported && (
          <IconButton label={notifOn ? 'Disable due notifications' : 'Enable due notifications'} active={notifOn} onClick={notif.onToggle}>
            <NotifIcon className="h-[18px] w-[18px]" />
          </IconButton>
        )}
        <IconButton label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'} onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </IconButton>
        <InstallButton />
      </div>
    </header>
  )
}
