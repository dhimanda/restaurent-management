import { useEffect, useState } from 'react'
import { useMenuStore } from '../stores/useMenuStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Modal } from '../components/ui/Modal'
import { showToast, ToastContainer } from '../components/ui/Toast'
import { formatCurrency } from '../utils/format'
import { TAG_OPTIONS } from '../utils/constants'
import { MenuItemInput, MenuItem } from '../types/menu'
import { Plus, Search, Edit3, Trash2, ImagePlus, X } from 'lucide-react'

export function MenuPage(): JSX.Element {
  const store = useMenuStore()
  const currencySymbol = useSettingsStore(s => s.getSetting('currency_symbol', '$'))

  useEffect(() => { store.fetchItems(); store.fetchCategories() }, [])

  const filteredItems = store.getFilteredItems()

  return (
    <div className="flex flex-col h-full">
      <ToastContainer />
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary">Menu Management</h1>
          <button onClick={() => { store.setEditingItem(null); store.setFormOpen(true) }} className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-black font-semibold rounded-xl transition-colors min-h-[48px]">
            <Plus className="w-5 h-5" /><span>Add Item</span>
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input type="text" value={store.searchQuery} onChange={e => store.setSearchQuery(e.target.value)} placeholder="Search menu items..." className="w-full pl-12 pr-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none min-h-[48px]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => store.setActiveCategory(null)} className={'px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors min-h-[44px] ' + (store.activeCategory === null ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-hover text-text-secondary hover:text-text-primary border border-transparent')}>All Items</button>
          {store.categories.map(cat => (
            <button key={cat.id} onClick={() => store.setActiveCategory(cat.id)} className={'px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors min-h-[44px] ' + (store.activeCategory === cat.id ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-hover text-text-secondary hover:text-text-primary border border-transparent')}>{cat.name}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {store.isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted"><p className="text-lg mb-2">No menu items found</p><p className="text-sm">Add your first menu item to get started</p></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <MenuItemCard key={item.id} item={item} currencySymbol={currencySymbol} onToggle={() => store.toggleAvailability(item.id)} onEdit={() => { store.setEditingItem(item); store.setFormOpen(true) }} onDelete={async () => { await store.deleteItem(item.id); showToast('Item deleted', 'success') }} />
            ))}
          </div>
        )}
      </div>
      <MenuFormModal isOpen={store.isFormOpen} onClose={() => store.setFormOpen(false)} editingItem={store.editingItem} categories={store.categories} onSave={async (data) => { if (store.editingItem) { await store.updateItem(store.editingItem.id, data); showToast('Updated', 'success') } else { await store.createItem(data as MenuItemInput); showToast('Created', 'success') }; store.setFormOpen(false) }} />
    </div>
  )
}

function MenuItemCard({ item, currencySymbol, onToggle, onEdit, onDelete }: { item: MenuItem; currencySymbol: string; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={'bg-surface-card border rounded-xl p-4 flex flex-col transition-colors ' + (item.availability ? 'border-border hover:border-primary/30' : 'border-border opacity-60')}>
      <div className="h-32 bg-surface-hover rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {item.image_path ? <img src={'file://' + item.image_path} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-4xl">🍽️</span>}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-text-primary text-base leading-tight">{item.name}</h3>
        <p className="text-xs text-text-muted mb-2">{item.category_name}</p>
        <p className="text-xl font-bold text-primary">{formatCurrency(item.price, currencySymbol)}</p>
        {item.tags && <div className="flex flex-wrap gap-1 mt-2">{item.tags.split(',').map((tag, i) => <span key={i} className="px-2 py-0.5 text-xs bg-surface-hover rounded-md text-text-muted">{tag.trim()}</span>)}</div>}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <button onClick={onToggle} className={'relative w-14 h-8 rounded-full transition-colors ' + (item.availability ? 'bg-emerald-500' : 'bg-gray-600')} aria-label="Toggle availability">
          <span className={'absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ' + (item.availability ? 'left-7' : 'left-1')} />
        </button>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-2.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-blue-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-2.5 rounded-lg hover:bg-danger-soft text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}

function MenuFormModal({ isOpen, onClose, editingItem, categories, onSave }: { isOpen: boolean; onClose: () => void; editingItem: MenuItem | null; categories: { id: number; name: string }[]; onSave: (d: any) => Promise<void> }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [costPrice, setCostPrice] = useState('')
  const [description, setDescription] = useState('')
  const [imagePath, setImagePath] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [taxRate, setTaxRate] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [sku, setSku] = useState('')

  useEffect(() => {
    if (editingItem) { setName(editingItem.name); setPrice(String(editingItem.price)); setCategoryId(editingItem.category_id); setCostPrice(editingItem.cost_price ? String(editingItem.cost_price) : ''); setDescription(editingItem.description || ''); setImagePath(editingItem.image_path || ''); setTags(editingItem.tags ? editingItem.tags.split(',').map(t => t.trim()) : []); setTaxRate(editingItem.tax_rate ? String(editingItem.tax_rate) : ''); setPrepTime(editingItem.preparation_time ? String(editingItem.preparation_time) : ''); setSku(editingItem.sku || '') }
    else { setName(''); setPrice(''); setCategoryId(categories.length > 0 ? categories[0].id : 0); setCostPrice(''); setDescription(''); setImagePath(''); setTags([]); setTaxRate(''); setPrepTime(''); setSku('') }
  }, [editingItem, isOpen])

  const ic = 'w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none min-h-[48px]'
  const lc = 'block text-sm font-medium text-text-secondary mb-1.5'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={lc}>Item Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Burger" className={ic} /></div>
        <div><label className={lc}>Price *</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={ic} /></div>
        <div><label className={lc}>Category *</label><select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} className={ic}><option value={0}>Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className={lc}>Cost Price</label><input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className={ic} /></div>
        <div><label className={lc}>SKU</label><input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="BRG-001" className={ic} /></div>
        <div className="col-span-2"><label className={lc}>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." className={ic + ' min-h-[80px] resize-none'} /></div>
        <div className="col-span-2"><label className={lc}>Image</label><div className="flex items-center gap-3">{imagePath && <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border"><img src={'file://' + imagePath} alt="" className="w-full h-full object-cover" /><button onClick={() => setImagePath('')} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full"><X className="w-3 h-3 text-white" /></button></div>}<button onClick={async () => { const p = await window.api.menu.pickImage(); if (p) setImagePath(p) }} className="flex items-center gap-2 px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary min-h-[48px]"><ImagePlus className="w-5 h-5" /><span>{imagePath ? 'Change' : 'Choose Image'}</span></button></div></div>
        <div className="col-span-2"><label className={lc}>Tags</label><div className="flex flex-wrap gap-2">{TAG_OPTIONS.map(t => <button key={t} onClick={() => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])} className={'px-3 py-2 rounded-lg text-sm font-medium min-h-[40px] ' + (tags.includes(t) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-hover text-text-muted border border-transparent')}>{t}</button>)}</div></div>
        <div><label className={lc}>Tax Rate (%)</label><input type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="Default" className={ic} /></div>
        <div><label className={lc}>Prep Time (min)</label><input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} placeholder="15" className={ic} /></div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
        <button onClick={onClose} className="px-6 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover min-h-[48px] font-medium">Cancel</button>
        <button onClick={() => { if (!name.trim() || !price) { showToast('Fill required fields', 'warning'); return } onSave({ name: name.trim(), price: parseFloat(price), category_id: categoryId, cost_price: costPrice ? parseFloat(costPrice) : undefined, description: description || undefined, image_path: imagePath || undefined, tags: tags.length > 0 ? tags.join(', ') : undefined, tax_rate: taxRate ? parseFloat(taxRate) : undefined, preparation_time: prepTime ? parseInt(prepTime) : undefined, sku: sku || undefined }) }} className="px-8 py-3 bg-primary hover:bg-primary-hover text-black font-semibold rounded-xl min-h-[48px]">{editingItem ? 'Update' : 'Add Item'}</button>
      </div>
    </Modal>
  )
}
