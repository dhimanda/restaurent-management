import { useEffect, useState, useRef } from 'react'
import { useReportStore } from '../stores/useReportStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { ToastContainer, showToast } from '../components/ui/Toast'
import { formatCurrency, formatDateTime } from '../utils/format'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar, TrendingUp, ShoppingBag, DollarSign, Printer, Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, FileText, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TABS = [
  { key: 'daily', label: 'Daily Summary' },
  { key: 'range', label: 'Date Range' },
  { key: 'items', label: 'Item Performance' },
  { key: 'allorders', label: 'All Orders' },
  { key: 'bill', label: 'Bill View' }
]

export function ReportsPage(): JSX.Element {
  const activeTab = useReportStore(s => s.activeTab)
  const setActiveTab = useReportStore(s => s.setActiveTab)
  const fetchDailySummary = useReportStore(s => s.fetchDailySummary)
  const fetchDateRangeReport = useReportStore(s => s.fetchDateRangeReport)
  const fetchItemPerformance = useReportStore(s => s.fetchItemPerformance)
  const currencySymbol = useSettingsStore(s => s.getSetting('currency_symbol', '$'))

  const fetchAllOrders = useReportStore(s => s.fetchAllOrders)

  useEffect(() => {
    if (activeTab === 'daily') fetchDailySummary()
    if (activeTab === 'range') fetchDateRangeReport()
    if (activeTab === 'items') fetchItemPerformance()
    if (activeTab === 'allorders') fetchAllOrders()
  }, [activeTab])

  const ic = 'px-3 py-2.5 bg-surface-hover border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none text-sm'

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Reports & Analytics</h1>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={'px-4 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors ' + (activeTab === t.key ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-hover text-text-secondary border border-transparent')}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'daily' && <DailyTab currencySymbol={currencySymbol} ic={ic} />}
        {activeTab === 'range' && <RangeTab currencySymbol={currencySymbol} ic={ic} />}
        {activeTab === 'items' && <ItemsTab currencySymbol={currencySymbol} ic={ic} />}
        {activeTab === 'allorders' && <AllOrdersTab currencySymbol={currencySymbol} ic={ic} />}
        {activeTab === 'bill' && <BillTab currencySymbol={currencySymbol} ic={ic} />}
      </div>
    </div>
  )
}

function exportDailyPdf(s: any, date: string, currencySymbol: string) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Daily Report — ' + date, 14, 18)
  doc.setFontSize(11)
  doc.text('Orders: ' + s.total_orders + '  |  Revenue: ' + currencySymbol + s.total_revenue.toFixed(2), 14, 28)

  autoTable(doc, {
    startY: 36,
    head: [['Item', 'Qty Sold', 'Revenue']],
    body: (s.top_items || []).map((i: any) => [i.name, i.total_qty, currencySymbol + i.total_revenue.toFixed(2)]),
    headStyles: { fillColor: [245, 158, 11] }
  })
  doc.save('daily-report-' + date + '.pdf')
}

function DailyTab({ currencySymbol, ic }: { currencySymbol: string; ic: string }) {
  const dailySummary = useReportStore(s => s.dailySummary)
  const selectedDate = useReportStore(s => s.selectedDate)
  const setSelectedDate = useReportStore(s => s.setSelectedDate)
  const fetchDailySummary = useReportStore(s => s.fetchDailySummary)
  const s = dailySummary

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-5 h-5 text-text-muted" />
        <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setTimeout(() => fetchDailySummary(), 0) }} className={ic} />
        {s && (
          <button
            id="daily-export-pdf-btn"
            onClick={() => exportDailyPdf(s, selectedDate, currencySymbol)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-emerald-500/25"
          >
            <Download className="w-4 h-4" />Export PDF
          </button>
        )}
      </div>
      {!s ? <p className="text-text-muted">No report data yet. Change the date or place some orders first.</p> : (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Total Orders" value={s.total_orders} />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="Revenue" value={formatCurrency(s.total_revenue, currencySymbol)} highlight />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg Order Value" value={formatCurrency(s.avg_order_value, currencySymbol)} />
            <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Items Sold" value={s.total_items_sold} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-card border border-border rounded-xl p-4">
              <h3 className="text-base font-semibold text-text-primary mb-3">Top Items</h3>
              {s.top_items && s.top_items.length > 0 ? (
                <div className="space-y-2">{s.top_items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-surface rounded-lg">
                    <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span><span className="text-sm text-text-primary">{item.name}</span></div>
                    <div className="text-right"><p className="text-sm font-semibold text-primary">{formatCurrency(item.total_revenue, currencySymbol)}</p><p className="text-xs text-text-muted">{item.total_qty} sold</p></div>
                  </div>
                ))}</div>
              ) : <p className="text-sm text-text-muted">No data</p>}
            </div>
            <div className="bg-surface-card border border-border rounded-xl p-4">
              <h3 className="text-base font-semibold text-text-primary mb-3">Payment Breakdown</h3>
              {s.payment_breakdown && s.payment_breakdown.length > 0 ? (
                <div className="space-y-2">{s.payment_breakdown.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-surface rounded-lg">
                    <span className="text-sm text-text-primary capitalize">{p.payment_method}</span>
                    <div className="text-right"><p className="text-sm font-semibold text-text-primary">{formatCurrency(p.total, currencySymbol)}</p><p className="text-xs text-text-muted">{p.count} orders</p></div>
                  </div>
                ))}</div>
              ) : <p className="text-sm text-text-muted">No data</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RangeTab({ currencySymbol, ic }: { currencySymbol: string; ic: string }) {
  const dateRangeReport = useReportStore(s => s.dateRangeReport)
  const dateFrom = useReportStore(s => s.dateFrom)
  const dateTo = useReportStore(s => s.dateTo)
  const setDateFrom = useReportStore(s => s.setDateFrom)
  const setDateTo = useReportStore(s => s.setDateTo)
  const fetchDateRangeReport = useReportStore(s => s.fetchDateRangeReport)
  const r = dateRangeReport

  const handleExportCsv = async () => {
    const result = await window.api.sync.exportCsv('orders', dateFrom, dateTo)
    showToast(result.message, result.success ? 'success' : 'error')
  }

  const handleExportPdf = () => {
    if (!r) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Range Report: ' + dateFrom + ' to ' + dateTo, 14, 18)
    autoTable(doc, {
      startY: 28,
      head: [['Order ID', 'Table', 'Status', 'Payment', 'Total', 'Time']],
      body: (r.orders || []).map((o: any) => [
        '#' + (o.order_number || o.id), o.table_no || '-', o.status, o.payment_method,
        currencySymbol + (o.grand_total || 0).toFixed(2), o.order_time
      ]),
      headStyles: { fillColor: [245, 158, 11] }
    })
    doc.save('range-report-' + dateFrom + '-to-' + dateTo + '.pdf')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ic} />
        <span className="text-text-muted">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ic} />
        <button id="range-generate-btn" onClick={() => fetchDateRangeReport()} className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg text-sm min-h-[40px]">Generate</button>
        {r && (
          <>
            <button id="range-export-csv-btn" onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-emerald-500/25">
              <Download className="w-4 h-4" />CSV
            </button>
            <button id="range-export-pdf-btn" onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-blue-500/25">
              <Download className="w-4 h-4" />PDF
            </button>
          </>
        )}
      </div>
      {!r ? <p className="text-text-muted">Select a range and click Generate</p> : (
        <div>
          {r.summary && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard label="Total Orders" value={r.summary.total_orders} />
              <StatCard label="Total Revenue" value={formatCurrency(r.summary.total_revenue, currencySymbol)} highlight />
              <StatCard label="Avg Order" value={formatCurrency(r.summary.avg_order_value, currencySymbol)} />
            </div>
          )}
          {r.daily_revenue && r.daily_revenue.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-4 mb-6">
              <h3 className="text-base font-semibold text-text-primary mb-4">Revenue Chart</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={r.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2d3348', borderRadius: 8, color: '#f1f5f9' }} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ItemsTab({ currencySymbol, ic }: { currencySymbol: string; ic: string }) {
  const itemPerformance = useReportStore(s => s.itemPerformance)
  const dateFrom = useReportStore(s => s.dateFrom)
  const dateTo = useReportStore(s => s.dateTo)
  const setDateFrom = useReportStore(s => s.setDateFrom)
  const setDateTo = useReportStore(s => s.setDateTo)
  const fetchItemPerformance = useReportStore(s => s.fetchItemPerformance)

  const handleExportCsv = async () => {
    const result = await window.api.sync.exportCsv('items', dateFrom, dateTo)
    showToast(result.message, result.success ? 'success' : 'error')
  }

  const handleExportPdf = () => {
    if (itemPerformance.length === 0) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Item Performance: ' + dateFrom + ' to ' + dateTo, 14, 18)
    autoTable(doc, {
      startY: 28,
      head: [['Item', 'Orders', 'Qty Sold', 'Revenue', 'Avg Price']],
      body: itemPerformance.map((i: any) => [
        i.name, i.order_count, i.total_qty,
        currencySymbol + i.total_revenue.toFixed(2),
        currencySymbol + i.avg_price.toFixed(2)
      ]),
      headStyles: { fillColor: [245, 158, 11] }
    })
    doc.save('item-performance-' + dateFrom + '-to-' + dateTo + '.pdf')
  }

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ic} />
        <span className="text-text-muted self-center">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ic} />
        <button id="items-generate-btn" onClick={() => fetchItemPerformance()} className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg text-sm min-h-[40px]">Generate</button>
        {itemPerformance.length > 0 && (
          <>
            <button id="items-export-csv-btn" onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-emerald-500/25">
              <Download className="w-4 h-4" />CSV
            </button>
            <button id="items-export-pdf-btn" onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-blue-500/25">
              <Download className="w-4 h-4" />PDF
            </button>
          </>
        )}
      </div>
      {itemPerformance.length === 0 ? <p className="text-text-muted">No data</p> : (
        <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Item</th>
                <th className="text-center px-3 py-3 text-text-muted font-medium">Orders</th>
                <th className="text-center px-3 py-3 text-text-muted font-medium">Qty Sold</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Revenue</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Avg Price</th>
              </tr>
            </thead>
            <tbody>{itemPerformance.map((item: any, i: number) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-text-primary font-medium">{item.name}</td>
                <td className="text-center px-3 py-3 text-text-secondary">{item.order_count}</td>
                <td className="text-center px-3 py-3 text-text-secondary">{item.total_qty}</td>
                <td className="text-right px-4 py-3 text-primary font-semibold">{formatCurrency(item.total_revenue, currencySymbol)}</td>
                <td className="text-right px-4 py-3 text-text-secondary">{formatCurrency(item.avg_price, currencySymbol)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BillTab({ currencySymbol, ic }: { currencySymbol: string; ic: string }) {
  const billOrderId = useReportStore(s => s.billOrderId)
  const billOrder = useReportStore(s => s.billOrder)
  const setBillOrderId = useReportStore(s => s.setBillOrderId)
  const fetchBillOrder = useReportStore(s => s.fetchBillOrder)

  const handleExportPdf = async () => {
    if (!billOrder) return
    const result = await window.api.print.exportPdf(billOrder.id)
    showToast(result.message || 'Done', result.success ? 'success' : 'error')
  }

  // Calculate actual discount for display
  let discountAmount = 0
  if (billOrder && billOrder.discount_value > 0) {
    if (billOrder.discount_type === 'percentage') {
      discountAmount = Math.round((billOrder.subtotal * (billOrder.discount_value / 100) + Number.EPSILON) * 100) / 100
    } else {
      discountAmount = billOrder.discount_value
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-5 h-5 text-text-muted" />
        <input type="text" value={billOrderId} onChange={e => setBillOrderId(e.target.value)} placeholder="Enter Order ID" className={ic + ' w-48'} />
        <button onClick={() => fetchBillOrder()} className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg text-sm min-h-[40px]">Look Up</button>
      </div>
      {billOrder && (
        <div className="max-w-md mx-auto bg-white text-black rounded-xl p-6 border">
          <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-gray-300">
            <h2 className="text-lg font-bold">{billOrder.table_no ? 'Table ' + billOrder.table_no : 'Order'} #{billOrder.order_number || billOrder.id}</h2>
            <p className="text-xs text-gray-500">{formatDateTime(billOrder.order_time)}</p>
            <p className="text-xs text-gray-400 mt-1">Payment: {billOrder.payment_method}</p>
          </div>
          {billOrder.items && billOrder.items.map((item: any) => (
            <div key={item.id} className="flex justify-between py-1 text-sm border-b border-gray-100">
              <span>{item.name} x{item.qty}</span>
              <span>{formatCurrency(item.qty * item.unit_price, currencySymbol)}</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(billOrder.subtotal, currencySymbol)}</span></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount{billOrder.discount_type === 'percentage' ? ' (' + billOrder.discount_value + '%)' : ''}</span>
                <span>-{formatCurrency(discountAmount, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(billOrder.tax_total, currencySymbol)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1"><span>TOTAL</span><span>{formatCurrency(billOrder.grand_total, currencySymbol)}</span></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => window.api.print.printBill(billOrder.id)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-lg font-medium"><Printer className="w-4 h-4" />Print</button>
            <button id="bill-export-pdf-btn" onClick={handleExportPdf} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Download className="w-4 h-4" />Export PDF</button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-surface-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-text-muted">{icon}<span className="text-xs font-medium uppercase tracking-wider">{label}</span></div>
      <p className={'text-2xl font-bold ' + (highlight ? 'text-primary' : 'text-text-primary')}>{value}</p>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  preparing: 'bg-blue-500/15 text-blue-400',
  served: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400'
}

function AllOrdersTab({ currencySymbol, ic }: { currencySymbol: string; ic: string }) {
  const filters = useReportStore(s => s.allOrdersFilters)
  const result = useReportStore(s => s.allOrdersResult)
  const loading = useReportStore(s => s.allOrdersLoading)
  const errorMsg = useReportStore(s => s.allOrdersError)
  const setFilter = useReportStore(s => s.setAllOrdersFilter)
  const setPage = useReportStore(s => s.setAllOrdersPage)
  const setSort = useReportStore(s => s.setAllOrdersSort)
  const fetchAll = useReportStore(s => s.fetchAllOrders)
  const fetchForExport = useReportStore(s => s.fetchAllOrdersForExport)

  const paymentMethods = useSettingsStore(s => s.paymentMethods)
  const fetchPaymentMethods = useSettingsStore(s => s.fetchPaymentMethods)

  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  // Auto-fetch when filters/page/sort change
  useEffect(() => {
    fetchAll()
  }, [
    filters.search, filters.status, filters.paymentMethod,
    filters.dateFrom, filters.dateTo,
    filters.amountMin, filters.amountMax,
    filters.sortBy, filters.sortDir, filters.page
  ])

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setFilter('search', value)
    }, 400)
  }

  const SortHeader = ({ column, children }: { column: string; children: React.ReactNode }) => {
    const isActive = filters.sortBy === column
    return (
      <th
        onClick={() => setSort(column)}
        className="px-4 py-3 text-text-muted font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (filters.sortDir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
            : <ChevronDown className="w-3.5 h-3.5 text-primary" />
          )}
        </div>
      </th>
    )
  }

  const handleExportPdf = async () => {
    if (!result || result.total === 0) return
    setIsExporting(true)
    try {
      const allOrders = await fetchForExport()
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14)
      doc.text('All Orders Report (' + allOrders.length + ' orders)', 14, 16)
      doc.setFontSize(9)
      const filterDesc: string[] = []
      if (filters.search) filterDesc.push('Search: ' + filters.search)
      if (filters.status) filterDesc.push('Status: ' + filters.status)
      if (filters.paymentMethod) filterDesc.push('Payment: ' + filters.paymentMethod)
      if (filters.dateFrom) filterDesc.push('From: ' + filters.dateFrom)
      if (filters.dateTo) filterDesc.push('To: ' + filters.dateTo)
      if (filterDesc.length > 0) doc.text(filterDesc.join('  |  '), 14, 24)

      autoTable(doc, {
        startY: filterDesc.length > 0 ? 30 : 22,
        head: [['Order #', 'Date', 'Table', 'Items', 'Status', 'Payment', 'Total']],
        body: allOrders.map((o: any) => [
          o.order_number || o.id,
          o.order_time || '',
          o.table_no || '-',
          o.items_summary || '-',
          o.status,
          o.payment_method,
          currencySymbol + (o.grand_total || 0).toFixed(2)
        ]),
        headStyles: { fillColor: [245, 158, 11], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: { 3: { cellWidth: 50 } }
      })
      doc.save('all-orders-report.pdf')
    } catch (err) {
      showToast('Export failed', 'error')
    }
    setIsExporting(false)
  }

  const handleExportCsv = async () => {
    if (!result || result.total === 0) return
    setIsExporting(true)
    try {
      const allOrders = await fetchForExport()
      const headers = ['Order #', 'Date', 'Table', 'Items', 'Qty', 'Status', 'Payment', 'Subtotal', 'Tax', 'Total']
      const escape = (val: any) => {
        const s = val == null ? '' : String(val)
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s
      }
      const lines = [headers.join(',')]
      for (const o of allOrders) {
        lines.push([
          escape(o.order_number || o.id),
          escape(o.order_time),
          escape(o.table_no),
          escape(o.items_summary),
          escape(o.total_items),
          escape(o.status),
          escape(o.payment_method),
          escape((o.subtotal || 0).toFixed(2)),
          escape((o.tax_total || 0).toFixed(2)),
          escape((o.grand_total || 0).toFixed(2))
        ].join(','))
      }
      const csv = lines.join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'all-orders-report.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast('Export failed', 'error')
    }
    setIsExporting(false)
  }

  const orders = result ? result.orders : []
  const totalPages = result ? result.totalPages : 0

  return (
    <div>
      {/* Search & Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            defaultValue={filters.search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search orders, items, amounts..."
            className={ic + ' pl-10 w-full'}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium min-h-[40px] transition-colors ' + (showFilters ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-hover text-text-secondary border border-border')}
        >
          <Filter className="w-4 h-4" />Filters
        </button>
        <div className="flex-1" />
        {orders.length > 0 && (
          <>
            <button onClick={handleExportCsv} disabled={isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-emerald-500/25 disabled:opacity-50">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}CSV (All)
            </button>
            <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium min-h-[40px] hover:bg-blue-500/25 disabled:opacity-50">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}PDF (All)
            </button>
          </>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-surface-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Status</label>
              <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className={ic + ' w-full'}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="served">Served</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Payment Method</label>
              <select value={filters.paymentMethod} onChange={e => setFilter('paymentMethod', e.target.value)} className={ic + ' w-full'}>
                <option value="">All Methods</option>
                {paymentMethods.map(pm => <option key={pm.id} value={pm.label}>{pm.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} className={ic + ' w-full'} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Date To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} className={ic + ' w-full'} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Min Amount</label>
              <input type="number" value={filters.amountMin} onChange={e => setFilter('amountMin', e.target.value)} placeholder="0" className={ic + ' w-full'} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Max Amount</label>
              <input type="number" value={filters.amountMax} onChange={e => setFilter('amountMax', e.target.value)} placeholder="999" className={ic + ' w-full'} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilter('status', '')
                  setFilter('paymentMethod', '')
                  setFilter('dateFrom', '')
                  setFilter('dateTo', '')
                  setFilter('amountMin', '')
                  setFilter('amountMax', '')
                  setFilter('search', '')
                }}
                className="px-4 py-2.5 bg-surface-hover text-text-muted border border-border rounded-lg text-sm min-h-[40px] hover:text-text-primary"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {result && (
        <div className="flex items-center gap-4 mb-3 text-sm text-text-muted">
          <span>{result.total} order{result.total !== 1 ? 's' : ''} found</span>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3 text-sm text-red-400">
          Failed to load orders: {errorMsg}. <button onClick={() => fetchAll()} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Table */}
      {orders.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center h-48 text-text-muted">
          <FileText className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No orders found. Adjust your filters or search.</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <SortHeader column="order_number">Order #</SortHeader>
                  <SortHeader column="order_time">Date</SortHeader>
                  <SortHeader column="table_no">Table</SortHeader>
                  <th className="px-4 py-3 text-text-muted font-medium text-left">Items</th>
                  <SortHeader column="status">Status</SortHeader>
                  <SortHeader column="payment_method">Payment</SortHeader>
                  <SortHeader column="grand_total">Total</SortHeader>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-text-primary">{o.order_number || '#' + o.id}</td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(o.order_time)}</td>
                    <td className="px-4 py-3 text-text-secondary">{o.table_no || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate" title={o.items_summary || ''}>{o.items_summary || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (STATUS_COLORS[o.status] || '')}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{o.payment_method}</td>
                    <td className="px-4 py-3 text-primary font-semibold text-right">{formatCurrency(o.grand_total || 0, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-text-muted">
                Page {filters.page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (filters.page <= 4) {
                    pageNum = i + 1
                  } else if (filters.page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = filters.page - 3 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={'w-8 h-8 rounded-lg text-sm font-medium ' + (filters.page === pageNum ? 'bg-primary/15 text-primary border border-primary/30' : 'text-text-secondary hover:bg-surface-hover')}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(filters.page + 1)}
                  disabled={filters.page >= totalPages}
                  className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
