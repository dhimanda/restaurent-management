import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { showToast, ToastContainer } from '../components/ui/Toast'
import {
  Store, Receipt, Cloud, Database, Save, Download, Upload, CircleCheck,
  Plus, Pencil, Trash2, X, Check, CreditCard, Tag
} from 'lucide-react'

export function SettingsPage(): JSX.Element {
  const store = useSettingsStore()
  const [form, setForm] = useState<Record<string, string>>({})

  // Payment method inline editing state
  const [newPmLabel, setNewPmLabel] = useState('')
  const [editingPmId, setEditingPmId] = useState<number | null>(null)
  const [editingPmLabel, setEditingPmLabel] = useState('')

  // Expense category inline editing state
  const [newCatName, setNewCatName] = useState('')
  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  useEffect(() => {
    store.fetchSettings().then(() => {
      setForm(store.settings)
    })
    store.fetchPaymentMethods()
    store.fetchExpenseCategories()
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

  // Payment method actions
  const handleAddPm = async () => {
    const label = newPmLabel.trim()
    if (!label) return
    await store.createPaymentMethod(label)
    setNewPmLabel('')
    showToast('Payment method added', 'success')
  }

  const handleUpdatePm = async (id: number) => {
    const label = editingPmLabel.trim()
    if (!label) return
    await store.updatePaymentMethod(id, label)
    setEditingPmId(null)
    showToast('Payment method updated', 'success')
  }

  const handleDeletePm = async (id: number, label: string) => {
    if (!confirm('Delete payment method "' + label + '"?')) return
    await store.deletePaymentMethod(id)
    showToast('Payment method deleted', 'success')
  }

  // Category actions
  const handleAddCat = async () => {
    const name = newCatName.trim()
    if (!name) return
    await store.createExpenseCategory(name)
    setNewCatName('')
    showToast('Category added', 'success')
  }

  const handleUpdateCat = async (id: number) => {
    const name = editingCatName.trim()
    if (!name) return
    await store.updateExpenseCategory(id, name)
    setEditingCatId(null)
    showToast('Category updated', 'success')
  }

  const handleDeleteCat = async (id: number, name: string) => {
    if (!confirm('Delete category "' + name + '"?')) return
    await store.deleteExpenseCategory(id)
    showToast('Category deleted', 'success')
  }

  const ic = 'w-full px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none min-h-[48px]'
  const lc = 'block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <div className="px-6 py-4 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
          <button
            id="settings-save-btn"
            onClick={handleSave}
            disabled={store.isSaving}
            className="flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-semibold rounded-xl transition-colors min-h-[48px] disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{store.isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Restaurant Info */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Store className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Restaurant Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lc}>Restaurant Name</label>
              <input
                id="settings-restaurant-name"
                type="text"
                value={form.restaurant_name || ''}
                onChange={e => updateField('restaurant_name', e.target.value)}
                className={ic}
              />
            </div>
            <div className="col-span-2">
              <label className={lc}>Address</label>
              <input
                type="text"
                value={form.restaurant_address || ''}
                onChange={e => updateField('restaurant_address', e.target.value)}
                className={ic}
              />
            </div>
            <div>
              <label className={lc}>Phone</label>
              <input
                type="text"
                value={form.restaurant_phone || ''}
                onChange={e => updateField('restaurant_phone', e.target.value)}
                className={ic}
              />
            </div>
          </div>
        </section>

        {/* Tax & Currency */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Tax & Currency</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lc}>Currency Symbol</label>
              <input
                type="text"
                value={form.currency_symbol || ''}
                onChange={e => updateField('currency_symbol', e.target.value)}
                placeholder="$"
                className={ic}
              />
            </div>
            <div>
              <label className={lc}>Default Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.tax_rate || ''}
                onChange={e => updateField('tax_rate', e.target.value)}
                placeholder="5"
                className={ic}
              />
            </div>
            <div>
              <label className={lc}>Receipt Format</label>
              <select
                value={form.receipt_format || 'a4'}
                onChange={e => updateField('receipt_format', e.target.value)}
                className={ic}
              >
                <option value="a4">A4 Paper</option>
                <option value="thermal">58mm Thermal</option>
              </select>
            </div>
          </div>
        </section>

        {/* ─── Payment Methods ──────────────────────────────────────────────────── */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Payment Methods</h2>
          </div>

          <div className="space-y-2 mb-4">
            {store.paymentMethods.map(pm => (
              <div
                key={pm.id}
                className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl"
              >
                {editingPmId === pm.id ? (
                  <>
                    <input
                      id={'pm-edit-' + pm.id}
                      type="text"
                      value={editingPmLabel}
                      onChange={e => setEditingPmLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdatePm(pm.id) }}
                      className="flex-1 px-3 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdatePm(pm.id)}
                      className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingPmId(null)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-[var(--color-text-primary)] font-medium">{pm.label}</span>
                    <button
                      onClick={() => { setEditingPmId(pm.id); setEditingPmLabel(pm.label) }}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePm(pm.id, pm.label)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              id="pm-new-label"
              type="text"
              value={newPmLabel}
              onChange={e => setNewPmLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPm() }}
              placeholder="New payment method name"
              className="flex-1 px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
            />
            <button
              id="pm-add-btn"
              onClick={handleAddPm}
              className="flex items-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-medium rounded-xl text-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </section>

        {/* ─── Expense Categories ───────────────────────────────────────────────── */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Expense Categories</h2>
          </div>

          <div className="space-y-2 mb-4">
            {store.expenseCategories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl"
              >
                {editingCatId === cat.id ? (
                  <>
                    <input
                      id={'cat-edit-' + cat.id}
                      type="text"
                      value={editingCatName}
                      onChange={e => setEditingCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateCat(cat.id) }}
                      className="flex-1 px-3 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateCat(cat.id)}
                      className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingCatId(null)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-[var(--color-text-primary)] font-medium">{cat.name}</span>
                    <button
                      onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCat(cat.id, cat.name)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              id="cat-new-name"
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCat() }}
              placeholder="New category name"
              className="flex-1 px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
            />
            <button
              id="cat-add-btn"
              onClick={handleAddCat}
              className="flex items-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-medium rounded-xl text-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </section>

        {/* Google Drive */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Google Drive Sync</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                const r = await window.api.sync.connectDrive()
                showToast(r.message, r.success ? 'success' : 'info')
              }}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] min-h-[48px] font-medium"
            >
              <Cloud className="w-5 h-5" />
              Connect Google Drive
            </button>
            <button
              onClick={async () => {
                const r = await window.api.sync.syncNow()
                showToast(r.message, r.success ? 'success' : 'info')
              }}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] min-h-[48px] font-medium"
            >
              <CircleCheck className="w-5 h-5" />
              Sync Now
            </button>
            <span className="text-sm text-[var(--color-text-muted)]">Status: Not connected</span>
          </div>
        </section>

        {/* Data Backup */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Data Backup</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              id="settings-export-db-btn"
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium min-h-[48px] hover:bg-emerald-500/25"
            >
              <Download className="w-5 h-5" />
              Export Database
            </button>
            <button
              id="settings-import-db-btn"
              onClick={handleImport}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl font-medium min-h-[48px] hover:bg-amber-500/25"
            >
              <Upload className="w-5 h-5" />
              Import Database
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            Export saves a copy of your database. Import replaces all current data with the backup.
          </p>
        </section>
      </div>
    </div>
  )
}
