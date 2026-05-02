import { useEffect, useState } from 'react'
import { useExpenseStore, Expense } from '../stores/useExpenseStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useFundStore } from '../stores/useFundStore'
import { showToast, ToastContainer } from '../components/ui/Toast'
import { formatCurrency, getTodayDateString } from '../utils/format'
import {
  Wallet, Plus, Pencil, Trash2, X, Save, TrendingDown, BarChart3, Calendar
} from 'lucide-react'

interface ExpenseForm {
  date: string
  amount: string
  payment_method: string
  category: string
  responsible_person: string
  note: string
}

const EMPTY_FORM: ExpenseForm = {
  date: getTodayDateString(),
  amount: '',
  payment_method: '',
  category: '',
  responsible_person: '',
  note: ''
}

export function PaymentsPage(): JSX.Element {
  const expenses = useExpenseStore(s => s.expenses)
  const summary = useExpenseStore(s => s.summary)
  const isLoading = useExpenseStore(s => s.isLoading)
  const isSaving = useExpenseStore(s => s.isSaving)
  const filterFrom = useExpenseStore(s => s.filterFrom)
  const filterTo = useExpenseStore(s => s.filterTo)
  const fetchExpenses = useExpenseStore(s => s.fetchExpenses)
  const fetchSummary = useExpenseStore(s => s.fetchSummary)
  const createExpense = useExpenseStore(s => s.createExpense)
  const updateExpenseInStore = useExpenseStore(s => s.updateExpense)
  const deleteExpenseFromStore = useExpenseStore(s => s.deleteExpense)
  const setFilterFrom = useExpenseStore(s => s.setFilterFrom)
  const setFilterTo = useExpenseStore(s => s.setFilterTo)

  const balance = useFundStore(s => s.balance)
  const fetchBalance = useFundStore(s => s.fetchBalance)
  const setInitialFund = useFundStore(s => s.setInitialFund)

  const paymentMethods = useSettingsStore(s => s.paymentMethods)
  const expenseCategories = useSettingsStore(s => s.expenseCategories)
  const fetchPaymentMethods = useSettingsStore(s => s.fetchPaymentMethods)
  const fetchExpenseCategories = useSettingsStore(s => s.fetchExpenseCategories)
  const currencySymbol = useSettingsStore(s => s.getSetting('currency_symbol', '$'))

  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM)
  const [initialFundInput, setInitialFundInput] = useState('')
  const [showFundInput, setShowFundInput] = useState(false)
  const [responsiblePersons, setResponsiblePersons] = useState<string[]>([])

  useEffect(() => {
    fetchPaymentMethods()
    fetchExpenseCategories()
    fetchBalance()
    fetchExpenses({ from: filterFrom, to: filterTo })
    fetchSummary(filterFrom, filterTo)
    window.api.expenses.getResponsiblePersons().then(p => setResponsiblePersons(p)).catch(() => {})
  }, [])

  const handleApplyFilter = () => {
    fetchExpenses({ from: filterFrom, to: filterTo })
    fetchSummary(filterFrom, filterTo)
  }

  const handleOpenAdd = () => {
    setEditingExpense(null)
    setForm({
      ...EMPTY_FORM,
      payment_method: paymentMethods.length > 0 ? paymentMethods[0].label : '',
      category: expenseCategories.length > 0 ? expenseCategories[0].name : '',
      responsible_person: form.responsible_person || ''
    })
    setShowModal(true)
  }

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setForm({
      date: expense.date,
      amount: String(expense.amount),
      payment_method: expense.payment_method,
      category: expense.category,
      responsible_person: expense.responsible_person || '',
      note: expense.note || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingExpense(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    const amount = parseFloat(form.amount)
    if (!form.date || isNaN(amount) || amount <= 0) {
      showToast('Please fill in date and a valid amount.', 'error')
      return
    }
    if (!form.category) {
      showToast('Please select a category.', 'error')
      return
    }
    if (!form.responsible_person || !form.responsible_person.trim()) {
      showToast('Please enter the responsible person.', 'error')
      return
    }

    const input = {
      date: form.date,
      amount,
      payment_method: form.payment_method,
      category: form.category,
      responsible_person: form.responsible_person,
      note: form.note || null
    }

    if (editingExpense) {
      await updateExpenseInStore(editingExpense.id, input)
      showToast('Expense updated', 'success')
    } else {
      await createExpense(input)
      showToast('Expense recorded', 'success')
    }

    await fetchBalance()
    await fetchSummary(filterFrom, filterTo)
    // Refresh autocomplete suggestions
    window.api.expenses.getResponsiblePersons().then(p => setResponsiblePersons(p)).catch(() => {})
    handleCloseModal()
  }

  const handleDelete = async (expense: Expense) => {
    if (!confirm('Delete this expense of ' + formatCurrency(expense.amount, currencySymbol) + '?')) return
    await deleteExpenseFromStore(expense.id)
    await fetchBalance()
    await fetchSummary(filterFrom, filterTo)
    showToast('Expense deleted', 'success')
  }

  const handleSetInitialFund = async () => {
    const amount = parseFloat(initialFundInput)
    if (isNaN(amount) || amount < 0) {
      showToast('Enter a valid amount', 'error')
      return
    }
    await setInitialFund(amount)
    setShowFundInput(false)
    setInitialFundInput('')
    showToast('Initial fund set to ' + formatCurrency(amount, currencySymbol), 'success')
  }

  const ic = 'w-full px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none min-h-[48px]'
  const lc = 'block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'

  const isNegative = balance < 0

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />

      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Payments & Expenses</h1>
          </div>
          <button
            id="add-expense-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-semibold rounded-xl transition-colors min-h-[48px]"
          >
            <Plus className="w-5 h-5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Fund Balance Card */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-medium uppercase tracking-wider">Available Balance</p>
                <p className={'text-3xl font-bold ' + (isNegative ? 'text-red-400' : 'text-[var(--color-primary)]')}>
                  {formatCurrency(balance, currencySymbol)}
                </p>
              </div>
            </div>
            <button
              id="set-initial-fund-btn"
              onClick={() => setShowFundInput(!showFundInput)}
              className="px-4 py-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm font-medium min-h-[44px]"
            >
              Set Initial Fund
            </button>
          </div>

          {showFundInput && (
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
              <input
                id="initial-fund-input"
                type="number"
                min="0"
                step="0.01"
                value={initialFundInput}
                onChange={e => setInitialFundInput(e.target.value)}
                placeholder="Enter initial capital amount"
                className={ic + ' max-w-xs'}
              />
              <button
                onClick={handleSetInitialFund}
                className="flex items-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-semibold rounded-xl min-h-[48px]"
              >
                <Save className="w-4 h-4" />
                Apply
              </button>
              <button
                onClick={() => setShowFundInput(false)}
                className="px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          )}
        </section>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<TrendingDown className="w-5 h-5" />}
              label="Total Spent"
              value={formatCurrency(summary.total.total, currencySymbol)}
              color="text-red-400"
            />
            <SummaryCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Transactions"
              value={String(summary.total.count)}
            />
            {summary.byCategory.slice(0, 2).map((cat, i) => (
              <SummaryCard
                key={i}
                icon={<BarChart3 className="w-5 h-5" />}
                label={cat.category}
                value={formatCurrency(cat.total, currencySymbol)}
              />
            ))}
          </div>
        )}

        {/* Filters + CSV Export */}
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            id="expense-filter-from"
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="px-3 py-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none text-sm min-h-[40px]"
          />
          <span className="text-[var(--color-text-muted)] text-sm">to</span>
          <input
            id="expense-filter-to"
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="px-3 py-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none text-sm min-h-[40px]"
          />
          <button
            id="expense-apply-filter-btn"
            onClick={handleApplyFilter}
            className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-medium rounded-lg text-sm min-h-[40px]"
          >
            Apply
          </button>
          <button
            id="expense-export-csv-btn"
            onClick={async () => {
              const r = await window.api.sync.exportCsv('expenses', filterFrom, filterTo)
              showToast(r.message, r.success ? 'success' : 'error')
            }}
            className="px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-emerald-500/25"
          >
            Export CSV
          </button>
        </div>

        {/* Expenses Table */}
        <section className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-[var(--color-text-muted)]">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-[var(--color-text-muted)]">No expenses recorded yet.</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Click "Record Expense" to add one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left px-4 py-3 text-[var(--color-text-muted)] font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-muted)] font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-muted)] font-medium">Payment</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-muted)] font-medium">Note</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-muted)] font-medium">Received By</th>
                  <th className="text-right px-4 py-3 text-[var(--color-text-muted)] font-medium">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)]">
                    <td className="px-4 py-3 text-[var(--color-text-primary)] font-medium">{expense.date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-xs font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{expense.payment_method}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] max-w-[200px] truncate">{expense.note || '—'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{expense.responsible_person || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      -{formatCurrency(expense.amount, currencySymbol)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleOpenEdit(expense)}
                          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface-modal)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingExpense ? 'Edit Expense' : 'Record Expense'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={lc}>Date</label>
                  <input
                    id="expense-form-date"
                    type="date"
                    value={form.date}
                    onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                    className={ic}
                  />
                </div>
                <div className="col-span-2">
                  <label className={lc}>Amount ({currencySymbol})</label>
                  <input
                    id="expense-form-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className={ic}
                  />
                </div>
                <div>
                  <label className={lc}>Category</label>
                  <select
                    id="expense-form-category"
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className={ic}
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lc}>Payment Method</label>
                  <select
                    id="expense-form-payment"
                    value={form.payment_method}
                    onChange={e => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className={ic}
                  >
                    <option value="">Select method</option>
                    {paymentMethods.map(pm => (
                      <option key={pm.id} value={pm.label}>{pm.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={lc}>Responsible Person <span className="text-red-400">*</span></label>
                  <input
                    id="expense-form-responsible-person"
                    type="text"
                    list="expense-responsible-persons-list"
                    value={form.responsible_person}
                    onChange={e => setForm(prev => ({ ...prev, responsible_person: e.target.value }))}
                    placeholder="Who received the money?"
                    className={ic}
                  />
                  <datalist id="expense-responsible-persons-list">
                    {responsiblePersons.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <label className={lc}>Note (optional)</label>
                  <input
                    id="expense-form-note"
                    type="text"
                    value={form.note}
                    onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Description..."
                    className={ic}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-[var(--color-border)]">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] font-medium min-h-[48px]"
              >
                Cancel
              </button>
              <button
                id="expense-form-save-btn"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-semibold rounded-xl min-h-[48px] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : (editingExpense ? 'Update' : 'Record')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={'text-2xl font-bold ' + (color || 'text-[var(--color-text-primary)]')}>{value}</p>
    </div>
  )
}
