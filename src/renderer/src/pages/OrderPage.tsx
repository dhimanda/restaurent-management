import { useEffect, useState, useRef } from 'react'
import { useOrderStore } from '../stores/useOrderStore'
import { useMenuStore } from '../stores/useMenuStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { showToast, ToastContainer } from '../components/ui/Toast'
import { formatCurrency } from '../utils/format'
import { MenuItem } from '../types/menu'
import { Search, Minus, Plus, X, ShoppingCart, Check, UtensilsCrossed } from 'lucide-react'

export function OrderPage(): JSX.Element {
  const menu = useMenuStore()
  const order = useOrderStore()
  const settings = useSettingsStore()
  const currencySymbol = settings.getSetting('currency_symbol', '$')
  const taxRate = parseFloat(settings.getSetting('tax_rate', '5'))

  const paymentMethods = useSettingsStore(s => s.paymentMethods)
  const fetchPaymentMethods = useSettingsStore(s => s.fetchPaymentMethods)

  const [menuSearch, setMenuSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    menu.fetchItems()
    menu.fetchCategories()
    fetchPaymentMethods()
  }, [])

  // Set default payment method when methods load and cart has no method set
  useEffect(() => {
    if (paymentMethods.length > 0 && !order.paymentMethod) {
      order.setPaymentMethod(paymentMethods[0].label)
    }
  }, [paymentMethods])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); if (searchRef.current) searchRef.current.focus() }
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handlePlaceOrder() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [order.cartItems])

  const availableItems = menu.items.filter(i => i.availability === 1)
  let filteredMenu = availableItems
  if (activeCategory !== null) filteredMenu = filteredMenu.filter(i => i.category_id === activeCategory)
  if (menuSearch.trim()) { const q = menuSearch.toLowerCase(); filteredMenu = filteredMenu.filter(i => i.name.toLowerCase().includes(q)) }

  const handleAddItem = (item: MenuItem) => {
    order.addItem({ menu_item_id: item.id, name: item.name, qty: 1, unit_price: item.price, notes: '' })
  }

  const handlePlaceOrder = async () => {
    if (order.cartItems.length === 0) { showToast('Cart is empty', 'warning'); return }
    const result = await order.placeOrder()
    if (result) {
      showToast('Order #' + result.order_number + ' placed successfully!', 'success')
      setTimeout(() => order.clearCart(), 1500)
    } else {
      showToast('Failed to place order', 'error')
    }
  }

  const subtotal = order.getSubtotal()
  const discountAmt = order.getDiscountAmount()
  const tax = order.getTaxTotal(taxRate)
  const grandTotal = order.getGrandTotal(taxRate)

  return (
    <div className="flex h-full overflow-hidden">
      <ToastContainer />

      {/* Left Panel - Menu Grid */}
      <div className="flex-1 flex flex-col border-r border-border min-w-0">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input ref={searchRef} type="text" value={menuSearch} onChange={e => setMenuSearch(e.target.value)} placeholder="Search menu... (Ctrl+F)" className="w-full pl-10 pr-4 py-2.5 bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setActiveCategory(null)} className={'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ' + (activeCategory === null ? 'bg-primary/15 text-primary' : 'bg-surface-hover text-text-muted')}>All</button>
            {menu.categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className={'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ' + (activeCategory === c.id ? 'bg-primary/15 text-primary' : 'bg-surface-hover text-text-muted')}>{c.name}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredMenu.map(item => (
              <button key={item.id} onClick={() => handleAddItem(item)} className="bg-surface-card border border-border rounded-xl text-left hover:border-primary/40 hover:bg-surface-hover transition-colors focus:border-primary active:scale-[0.98] overflow-hidden flex flex-col">
                <div className="w-full h-[72px] relative bg-surface-hover flex items-center justify-center shrink-0 overflow-hidden">
                  {item.image_path ? (
                    <img
                      src={'file://' + item.image_path}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                        const fallback = img.parentElement && img.parentElement.querySelector('.fallback-icon')
                        if (fallback) (fallback as HTMLElement).style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div className={'fallback-icon w-full h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 absolute inset-0 ' + (item.image_path ? 'hidden' : 'flex')}>
                    <UtensilsCrossed className="w-6 h-6 text-primary/40" />
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="font-medium text-text-primary text-sm leading-tight mb-1 line-clamp-2">{item.name}</p>
                  <p className="text-base font-bold text-primary">{formatCurrency(item.price, currencySymbol)}</p>
                </div>
              </button>
            ))}
          </div>
          {filteredMenu.length === 0 && <div className="flex items-center justify-center h-32 text-text-muted text-sm">No items found</div>}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[380px] flex flex-col bg-surface-card shrink-0">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><ShoppingCart className="w-5 h-5" />Cart</h2>
            {order.cartItems.length > 0 && <button onClick={() => order.clearCart()} className="text-xs text-text-muted hover:text-red-400 transition-colors">Clear</button>}
          </div>
          <input type="text" value={order.tableNo} onChange={e => order.setTableNo(e.target.value)} placeholder="Table No / Customer" className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none text-sm" />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {order.cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted"><ShoppingCart className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">Add items from the menu</p></div>
          ) : (
            <div className="flex flex-col gap-2">
              {order.cartItems.map(item => (
                <div key={item.menu_item_id} className="bg-surface rounded-lg p-3 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-text-primary truncate">{item.name}</p><p className="text-xs text-text-muted">{formatCurrency(item.unit_price, currencySymbol)} each</p></div>
                    <button onClick={() => order.removeItem(item.menu_item_id)} className="p-1 rounded hover:bg-danger-soft text-text-muted hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => order.updateQty(item.menu_item_id, item.qty - 1)} className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/30"><Minus className="w-4 h-4" /></button>
                      <span className="w-8 text-center font-semibold text-text-primary">{item.qty}</span>
                      <button onClick={() => order.updateQty(item.menu_item_id, item.qty + 1)} className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/30"><Plus className="w-4 h-4" /></button>
                    </div>
                    <p className="font-semibold text-text-primary">{formatCurrency(item.qty * item.unit_price, currencySymbol)}</p>
                  </div>
                  <input type="text" value={item.notes} onChange={e => order.setItemNotes(item.menu_item_id, e.target.value)} placeholder="Notes (e.g. no onion)" className="w-full mt-2 px-2 py-1.5 bg-surface-hover border border-border rounded text-xs text-text-secondary placeholder:text-text-muted focus:border-primary focus:outline-none" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {order.cartItems.length > 0 && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            {/* Discount + Payment Method */}
            <div className="flex gap-2 mb-3">
              <select value={order.discountType} onChange={e => order.setDiscountType(e.target.value as any)} className="px-2 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary focus:outline-none">
                <option value="">No Discount</option>
                <option value="flat">Flat</option>
                <option value="percentage">%</option>
              </select>
              {order.discountType && <input type="number" value={order.discountValue || ''} onChange={e => order.setDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0" className="flex-1 px-2 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none" />}
              <select
                id="order-payment-method"
                value={order.paymentMethod}
                onChange={e => order.setPaymentMethod(e.target.value)}
                className="px-2 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary focus:outline-none"
              >
                {paymentMethods.length === 0 && <option value="">Loading...</option>}
                {paymentMethods.map(pm => <option key={pm.id} value={pm.label}>{pm.label}</option>)}
              </select>
            </div>

            {/* Totals */}
            <div className="space-y-1 mb-3 text-sm">
              <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatCurrency(subtotal, currencySymbol)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>-{formatCurrency(discountAmt, currencySymbol)}</span></div>}
              <div className="flex justify-between text-text-secondary"><span>Tax ({taxRate}%)</span><span>{formatCurrency(tax, currencySymbol)}</span></div>
              <div className="flex justify-between text-text-primary font-bold text-lg pt-1 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(grandTotal, currencySymbol)}</span></div>
            </div>

            <button onClick={handlePlaceOrder} disabled={order.isPlacing} className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[56px]">
              <Check className="w-5 h-5" />
              {order.isPlacing ? 'Placing...' : 'Place Order (Ctrl+Enter)'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
