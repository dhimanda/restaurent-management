import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function MainLayout(): JSX.Element {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
