import { NavLink } from 'react-router-dom'
import {
  UtensilsCrossed,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Settings,
  ChefHat,
  Wallet,
  Sun,
  Moon
} from 'lucide-react'
import { useSettingsStore } from '../../stores/useSettingsStore'

const NAV_ITEMS = [
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/payments', label: 'Payments', icon: Wallet },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): JSX.Element {
  const settings = useSettingsStore(s => s.settings)
  const updateSetting = useSettingsStore(s => s.updateSetting)

  const isDark = (settings['theme'] || 'dark') === 'dark'

  const handleToggleTheme = () => {
    updateSetting('theme', isDark ? 'light' : 'dark')
  }

  return (
    <aside className="w-[220px] bg-[var(--color-surface-card)] border-r border-[var(--color-border)] flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[var(--color-border)] flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] flex items-center justify-center">
          <ChefHat className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">Restaurant</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              'flex items-center gap-3 px-4 py-3.5 rounded-lg text-[15px] font-medium transition-colors duration-150 ' +
              (isActive
                ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]')
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — Theme toggle + mode label */}
      <div className="p-4 border-t border-[var(--color-border)] space-y-2">
        <button
          id="theme-toggle-btn"
          onClick={handleToggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-active)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm font-medium"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          {isDark
            ? <Sun className="w-4 h-4 text-[var(--color-primary)]" />
            : <Moon className="w-4 h-4 text-[var(--color-primary)]" />
          }
        </button>
        <p className="text-xs text-[var(--color-text-muted)] text-center">Offline Mode</p>
      </div>
    </aside>
  )
}
