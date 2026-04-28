import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { MenuPage } from './pages/MenuPage'
import { OrderPage } from './pages/OrderPage'
import { DashboardPage } from './pages/DashboardPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSettingsStore } from './stores/useSettingsStore'

function App(): JSX.Element {
  const fetchSettings = useSettingsStore(state => state.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="orders" element={<OrderPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
