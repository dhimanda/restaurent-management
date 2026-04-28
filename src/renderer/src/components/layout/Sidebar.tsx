import { NavLink } from 'react-router-dom'
import {
  UtensilsCrossed,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Settings,
  ChefHat
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): JSX.Element {
  return (
    <aside className="w-[220px] bg-surface-card border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <ChefHat className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary leading-tight">Restaurant</h1>
          <p className="text-xs text-text-muted">Manager</p>
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
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary')
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-muted text-center">Offline Mode</p>
      </div>
    </aside>
  )
}
