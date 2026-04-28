import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { showToast, ToastContainer } from '../components/ui/Toast'
import { Store, Receipt, Cloud, Database, Save, Download, Upload, CircleCheck } from 'lucide-react'

export function SettingsPage(): JSX.Element {
  const store = useSettingsStore()
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    store.fetchSettings().then(() => {
      setForm(store.settings)
    })
  }, [])

  useEffect(() => {
    if (Object.keys(store.settings).length > 0) {
      setForm(store.settings)
    }
  }, [store.settings])

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    await store.updateMultipleSettings(form)
    showToast('Settings saved successfully', 'success')
  }

  const handleExport = async () => {
    const result = await window.api.sync.exportDb()
    if (result.success) {
      showToast('Database exported to ' + (result.path || 'file'), 'success')
    } else {
      showToast(result.message, 'error')
    }
  }

  const handleImport = async () => {
    if (!confirm('This will replace all current data. Are you sure?')) return
    const result = await window.api.sync.importDb()
    if (result.success) {
      showToast(result.message, 'success')
    } else {
      showToast(result.message, 'error')
    }
  }

  const ic = 'w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none min-h-[48px]'
  const lc = 'block text-sm font-medium text-text-secondary mb-1.5'

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <button onClick={handleSave} disabled={store.isSaving} className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-black font-semibold rounded-xl transition-colors min-h-[48px] disabled:opacity-50">
            <Save className="w-5 h-5" /><span>{store.isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Restaurant Info */}
        <section className="bg-surface-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Store className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold text-text-primary">Restaurant Information</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className={lc}>Restaurant Name</label><input type="text" value={form.restaurant_name || ''} onChange={e => updateField('restaurant_name', e.target.value)} className={ic} /></div>
            <div className="col-span-2"><label className={lc}>Address</label><input type="text" value={form.restaurant_address || ''} onChange={e => updateField('restaurant_address', e.target.value)} className={ic} /></div>
            <div><label className={lc}>Phone</label><input type="text" value={form.restaurant_phone || ''} onChange={e => updateField('restaurant_phone', e.target.value)} className={ic} /></div>
          </div>
        </section>

        {/* Tax & Currency */}
        <section className="bg-surface-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Receipt className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold text-text-primary">Tax & Currency</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lc}>Currency Symbol</label><input type="text" value={form.currency_symbol || ''} onChange={e => updateField('currency_symbol', e.target.value)} placeholder="$" className={ic} /></div>
            <div><label className={lc}>Default Tax Rate (%)</label><input type="number" step="0.1" value={form.tax_rate || ''} onChange={e => updateField('tax_rate', e.target.value)} placeholder="5" className={ic} /></div>
            <div><label className={lc}>Receipt Format</label>
              <select value={form.receipt_format || 'a4'} onChange={e => updateField('receipt_format', e.target.value)} className={ic}>
                <option value="a4">A4 Paper</option>
                <option value="thermal">58mm Thermal</option>
              </select>
            </div>
          </div>
        </section>

        {/* Google Drive */}
        <section className="bg-surface-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Cloud className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold text-text-primary">Google Drive Sync</h2></div>
          <div className="flex items-center gap-4">
            <button onClick={async () => { const r = await window.api.sync.connectDrive(); showToast(r.message, r.success ? 'success' : 'info') }} className="flex items-center gap-2 px-5 py-3 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary min-h-[48px] font-medium">
              <Cloud className="w-5 h-5" />Connect Google Drive
            </button>
            <button onClick={async () => { const r = await window.api.sync.syncNow(); showToast(r.message, r.success ? 'success' : 'info') }} className="flex items-center gap-2 px-5 py-3 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary min-h-[48px] font-medium">
              <CircleCheck className="w-5 h-5" />Sync Now
            </button>
            <span className="text-sm text-text-muted">Status: Not connected</span>
          </div>
        </section>

        {/* Data Backup */}
        <section className="bg-surface-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Database className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold text-text-primary">Data Backup</h2></div>
          <div className="flex items-center gap-4">
            <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium min-h-[48px] hover:bg-emerald-500/25">
              <Download className="w-5 h-5" />Export Database
            </button>
            <button onClick={handleImport} className="flex items-center gap-2 px-5 py-3 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl font-medium min-h-[48px] hover:bg-amber-500/25">
              <Upload className="w-5 h-5" />Import Database
            </button>
          </div>
          <p className="text-xs text-text-muted mt-3">Export saves a copy of your database. Import replaces all current data with the backup.</p>
        </section>
      </div>
    </div>
  )
}
