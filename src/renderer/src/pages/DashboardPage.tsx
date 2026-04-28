import { useEffect, useRef } from 'react'
import { useDashboardStore } from '../stores/useDashboardStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Modal } from '../components/ui/Modal'
import { showToast, ToastContainer } from '../components/ui/Toast'
import { formatCurrency, getTimeElapsed } from '../utils/format'
import { STATUS_BG_COLORS, STATUS_TEXT_COLORS, STATUS_LABELS } from '../utils/constants'
import { Order } from '../types/order'
import { Clock, Hash, Users, ChefHat, CheckCircle, XCircle, Printer, RefreshCw } from 'lucide-react'

const FILTER_TABS = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'served', label: 'Served' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' }
]

export function DashboardPage(): JSX.Element {
  const store = useDashboardStore()
  const currencySymbol = useSettingsStore(s => s.getSetting('currency_symbol', '$'))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    store.fetchOrders()
    intervalRef.current = setInterval(() => store.fetchOrders(), 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const orders = store.getFilteredOrders()

  const handleViewOrder = async (order: Order) => {
    const full = await window.api.orders.getById(order.id)
    store.setSelectedOrder(full)
    store.setDetailOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary">Order Dashboard</h1>
          <button onClick={() => store.fetchOrders()} className="flex items-center gap-2 px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary transition-colors min-h-[44px]">
            <RefreshCw className={'w-4 h-4 ' + (store.isLoading ? 'animate-spin' : '')} /><span className="text-sm">Refresh</span>
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => store.setFilter(tab.key)} className={'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ' + (store.activeFilter === tab.key ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-hover text-text-secondary border border-transparent')}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted"><p className="text-lg">No orders found</p></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map(order => (
              <button key={order.id} onClick={() => handleViewOrder(order)} className={'bg-surface-card border rounded-xl p-4 text-left transition-all hover:scale-[1.02] min-h-[140px] flex flex-col ' + (STATUS_BG_COLORS[order.status] || 'border-border')}>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-sm font-mono font-bold text-text-primary"><Hash className="w-4 h-4" />{order.id}</span>
                  <span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (STATUS_TEXT_COLORS[order.status] || '')}>{STATUS_LABELS[order.status] || order.status}</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  {order.table_no && <p className="flex items-center gap-1.5 text-sm text-text-secondary"><Users className="w-3.5 h-3.5" />Table {order.table_no}</p>}
                  <p className="flex items-center gap-1.5 text-sm text-text-secondary"><Clock className="w-3.5 h-3.5" />{getTimeElapsed(order.order_time)}</p>
                  <p className="flex items-center gap-1.5 text-sm text-text-secondary"><ChefHat className="w-3.5 h-3.5" />{order.total_items || order.item_count || 0} items</p>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-lg font-bold text-primary">{formatCurrency(order.grand_total, currencySymbol)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={store.isDetailOpen}
        order={store.selectedOrder}
        currencySymbol={currencySymbol}
        onClose={() => store.setDetailOpen(false)}
        onUpdateStatus={async (id, status) => { await store.updateStatus(id, status); showToast('Status updated', 'success') }}
        onCancel={async (id) => { await store.cancelOrder(id); showToast('Order cancelled', 'warning') }}
        onPrint={async (id) => { await window.api.print.printBill(id); showToast('Printing...', 'info') }}
      />
    </div>
  )
}

function OrderDetailModal({ isOpen, order, currencySymbol, onClose, onUpdateStatus, onCancel, onPrint }: {
  isOpen: boolean; order: any; currencySymbol: string; onClose: () => void
  onUpdateStatus: (id: number, status: string) => Promise<void>; onCancel: (id: number) => Promise<void>; onPrint: (id: number) => Promise<void>
}) {
  if (!order) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={'Order #' + order.id} size="md">
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div><span className="text-text-muted">Table:</span> <span className="text-text-primary font-medium">{order.table_no || 'N/A'}</span></div>
          <div><span className="text-text-muted">Status:</span> <span className={'font-semibold ' + (STATUS_TEXT_COLORS[order.status] || '')}>{STATUS_LABELS[order.status]}</span></div>
          <div><span className="text-text-muted">Payment:</span> <span className="text-text-primary">{order.payment_method}</span></div>
        </div>

        {/* Items */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-4 py-2.5 text-text-muted font-medium">Item</th><th className="text-center px-3 py-2.5 text-text-muted font-medium">Qty</th><th className="text-right px-4 py-2.5 text-text-muted font-medium">Amount</th></tr></thead>
            <tbody>
              {order.items && order.items.map((item: any) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5"><p className="text-text-primary">{item.name}</p>{item.notes && <p className="text-xs text-text-muted italic mt-0.5">{item.notes}</p>}</td>
                  <td className="text-center px-3 py-2.5 text-text-secondary">{item.qty}</td>
                  <td className="text-right px-4 py-2.5 text-text-primary font-medium">{formatCurrency(item.qty * item.unit_price, currencySymbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatCurrency(order.subtotal, currencySymbol)}</span></div>
          {order.discount_value > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>-{formatCurrency(order.discount_value, currencySymbol)}</span></div>}
          <div className="flex justify-between text-text-secondary"><span>Tax</span><span>{formatCurrency(order.tax_total, currencySymbol)}</span></div>
          <div className="flex justify-between font-bold text-lg text-text-primary pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(order.grand_total, currencySymbol)}</span></div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {order.status === 'pending' && <button onClick={() => onUpdateStatus(order.id, 'preparing')} className="flex items-center gap-2 px-4 py-3 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-xl font-medium min-h-[48px] hover:bg-blue-500/25"><ChefHat className="w-4 h-4" />Start Preparing</button>}
          {(order.status === 'pending' || order.status === 'preparing') && <button onClick={() => onUpdateStatus(order.id, 'served')} className="flex items-center gap-2 px-4 py-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium min-h-[48px] hover:bg-emerald-500/25"><CheckCircle className="w-4 h-4" />Mark Served</button>}
          {order.status !== 'cancelled' && order.status !== 'served' && <button onClick={() => onCancel(order.id)} className="flex items-center gap-2 px-4 py-3 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl font-medium min-h-[48px] hover:bg-red-500/25"><XCircle className="w-4 h-4" />Cancel</button>}
          <button onClick={() => onPrint(order.id)} className="flex items-center gap-2 px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-secondary font-medium min-h-[48px] hover:text-text-primary"><Printer className="w-4 h-4" />Print Bill</button>
        </div>
      </div>
    </Modal>
  )
}
