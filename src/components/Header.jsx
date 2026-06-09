import { CalendarDays, List, Clock, Sun, Moon, Bell, BellOff, BellRing, ChartNoAxesColumn, Settings, CalendarCheck } from 'lucide-react'
import { AppMark } from './AppMark.jsx'
import { IconButton } from './ui/IconButton.jsx'
import { InstallButton } from './InstallButton.jsx'
import { cn } from '../lib/cn.js'

const VIEWS = [
  { id: 'today', icon: CalendarCheck, label: 'Today'  },
  { id: 'month', icon: CalendarDays,  label: 'Month'  },
  { id: 'day',   icon: Clock,         label: 'Day'    },
  { id: 'list',  icon: List,          label: 'List'   },
]

export function Header({ view, onView, theme, onToggleTheme, onOpenStats, onOpenSettings, notif, health }) {
  const notifOn   = notif.permission === 'granted' && notif.enabled
  const NotifIcon = notif.permission === 'granted' ? (notif.enabled ? BellRing : Bell) : BellOff

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <AppMark />
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight">Reminders</h1>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
            <span className={cn(
              'inline-flex items-center gap-1 font-medium',
              health.mode === 'notion' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', health.mode === 'notion' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
              {health.mode === 'notion' ? 'Notion' : 'Local'}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className={cn(
              'inline-flex items-center gap-1 font-medium',
              health.aiConfigured ? 'text-indigo-500 dark:text-indigo-400' : 'text-zinc-400'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', health.aiConfigured ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
              {health.aiConfigured ? 'AI on' : 'AI off'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* View switcher */}
        <div className="glass-track mr-1.5 inline-flex rounded-xl p-0.5">
          {VIEWS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => onView(id)}
              style={view === id ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ring-focus',
                view === id
                  ? 'glass-sheen text-white shadow-sm shadow-brand-600/30'
                  : 'text-zinc-500 hover:bg-white/40 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200'
              )}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <IconButton label="Usage patterns" onClick={onOpenStats}>
          <ChartNoAxesColumn className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label="Settings" onClick={onOpenSettings}>
          <Settings className="h-[18px] w-[18px]" />
        </IconButton>
        {notif.supported && (
          <IconButton
            label={notifOn ? 'Disable notifications' : 'Enable notifications'}
            active={notifOn}
            onClick={notif.onToggle}
          >
            <NotifIcon className="h-[18px] w-[18px]" />
          </IconButton>
        )}
        <IconButton
          label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onClick={onToggleTheme}
        >
          {theme === 'dark'
            ? <Sun  className="h-[18px] w-[18px]" />
            : <Moon className="h-[18px] w-[18px]" />
          }
        </IconButton>
        <InstallButton />
      </div>
    </header>
  )
}
