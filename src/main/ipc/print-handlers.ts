import { ipcMain, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { getOrderById } from '../database/order-queries'
import { getAllSettings } from '../database/settings-queries'

export function registerPrintHandlers(db: Database.Database, getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('print:bill', async (_event, orderId: number) => {
    const order = getOrderById(db, orderId)
    if (!order) {
      return { success: false, message: 'Order not found' }
    }

    const settings = getAllSettings(db)
    const billHtml = generateBillHtml(order, settings)

    const printWindow = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      webPreferences: {
        contextIsolation: true
      }
    })

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(billHtml)}`)

    printWindow.webContents.print({ silent: false, printBackground: true }, (success) => {
      printWindow.close()
    })

    return { success: true }
  })
}

function generateBillHtml(order: any, settings: Record<string, string>): string {
  const currencySymbol = settings.currency_symbol || '$'
  const items = order.items || []

  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding: 4px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 4px 8px; text-align: center; border-bottom: 1px solid #eee;">${item.qty}</td>
      <td style="padding: 4px 0; text-align: right; border-bottom: 1px solid #eee;">${currencySymbol}${(item.unit_price * item.qty).toFixed(2)}</td>
    </tr>
    ${item.notes ? `<tr><td colspan="3" style="padding: 2px 0 4px 12px; font-size: 11px; color: #888; font-style: italic;">Note: ${item.notes}</td></tr>` : ''}
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; max-width: 300px; margin: 0 auto; color: #222; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #333; padding-bottom: 12px; }
    .header h1 { font-size: 18px; margin-bottom: 4px; }
    .header p { font-size: 11px; color: #555; }
    .meta { margin-bottom: 12px; font-size: 12px; }
    .meta div { display: flex; justify-content: space-between; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { text-align: left; padding: 4px 0; border-bottom: 2px solid #333; font-size: 12px; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3) { text-align: right; }
    .totals { border-top: 2px dashed #333; padding-top: 8px; }
    .totals div { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
    .totals .grand-total { font-size: 16px; font-weight: bold; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
    .footer { text-align: center; margin-top: 16px; border-top: 2px dashed #333; padding-top: 12px; font-size: 11px; color: #666; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${settings.restaurant_name || 'Restaurant'}</h1>
    <p>${settings.restaurant_address || ''}</p>
    <p>${settings.restaurant_phone || ''}</p>
  </div>

  <div class="meta">
    <div><span>Order #${order.id}</span><span>${order.order_time || ''}</span></div>
    <div><span>Table: ${order.table_no || 'N/A'}</span><span>Pay: ${order.payment_method || 'cash'}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${currencySymbol}${(order.subtotal || 0).toFixed(2)}</span></div>
    ${order.discount_value > 0 ? `<div><span>Discount${order.discount_type === 'percentage' ? ' (' + order.discount_value + '%)' : ''}</span><span>-${currencySymbol}${order.discount_type === 'percentage' ? ((order.subtotal * order.discount_value / 100)).toFixed(2) : (order.discount_value || 0).toFixed(2)}</span></div>` : ''}
    <div><span>Tax</span><span>${currencySymbol}${(order.tax_total || 0).toFixed(2)}</span></div>
    <div class="grand-total"><span>TOTAL</span><span>${currencySymbol}${(order.grand_total || 0).toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for dining with us!</p>
    <p>Please come again</p>
  </div>
</body>
</html>`
}
