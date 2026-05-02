import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { getOrderById } from '../database/order-queries'
import { getAllSettings } from '../database/settings-queries'

/**
 * Load HTML into a hidden BrowserWindow and wait until it is fully rendered.
 * Handles the race condition where data: URLs may fire did-finish-load
 * synchronously during loadURL — the listener MUST be attached first.
 */
function loadAndWaitForRender(win: BrowserWindow, html: string, paintDelayMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Attach the load listener BEFORE calling loadURL
    win.webContents.once('did-finish-load', () => {
      // Wait extra time for CSS painting
      setTimeout(resolve, paintDelayMs)
    })

    win.webContents.once('did-fail-load', (_e, code, desc) => {
      reject(new Error('Page load failed: ' + desc + ' (code: ' + code + ')'))
    })

    // Now trigger the load
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
    win.loadURL(dataUrl).catch(reject)
  })
}

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
      webPreferences: { contextIsolation: true }
    })

    await loadAndWaitForRender(printWindow, billHtml, 400)

    printWindow.webContents.print({ silent: false, printBackground: true }, () => {
      printWindow.close()
    })

    return { success: true }
  })

  ipcMain.handle('print:exportPdf', async (_event, orderId: number) => {
    const order = getOrderById(db, orderId)
    if (!order) {
      return { success: false, message: 'Order not found' }
    }

    const settings = getAllSettings(db)
    const billHtml = generateBillHtml(order, settings)

    const printWindow = new BrowserWindow({
      width: 400,
      height: 800,
      show: false,
      webPreferences: { contextIsolation: true }
    })

    await loadAndWaitForRender(printWindow, billHtml, 600)

    try {
      const pdfBuffer = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: { width: 80000, height: 297000 },
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      })

      printWindow.close()

      const orderData = order as any
      const defaultName = 'receipt-order-' + (orderData.order_number || orderId) + '.pdf'
      const result = await dialog.showSaveDialog({
        title: 'Save Receipt PDF',
        defaultPath: join(app.getPath('documents'), defaultName),
        filters: [{ name: 'PDF File', extensions: ['pdf'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export cancelled' }
      }

      writeFileSync(result.filePath, pdfBuffer)
      return { success: true, message: 'Receipt exported as PDF', path: result.filePath }
    } catch (error) {
      printWindow.close()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message: 'PDF export failed: ' + errorMessage }
    }
  })
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function generateBillHtml(order: any, settings: Record<string, string>): string {
  const currencySymbol = settings.currency_symbol || '$'
  const items = order.items || []

  const itemRows = items.map((item: any) => {
    const lineTotal = roundMoney(item.unit_price * item.qty)
    return `
    <tr>
      <td style="padding: 4px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 4px 8px; text-align: center; border-bottom: 1px solid #eee;">${item.qty}</td>
      <td style="padding: 4px 0; text-align: right; border-bottom: 1px solid #eee;">${currencySymbol}${lineTotal.toFixed(2)}</td>
    </tr>
    ${item.notes ? `<tr><td colspan="3" style="padding: 2px 0 4px 12px; font-size: 11px; color: #888; font-style: italic;">Note: ${item.notes}</td></tr>` : ''}`
  }).join('')

  // Calculate actual discount amount for display
  let discountDisplay = ''
  if (order.discount_value > 0) {
    let discountAmount = 0
    if (order.discount_type === 'percentage') {
      discountAmount = roundMoney(order.subtotal * (order.discount_value / 100))
      discountDisplay = `<div><span>Discount (${order.discount_value}%)</span><span>-${currencySymbol}${discountAmount.toFixed(2)}</span></div>`
    } else {
      discountAmount = roundMoney(order.discount_value)
      discountDisplay = `<div><span>Discount</span><span>-${currencySymbol}${discountAmount.toFixed(2)}</span></div>`
    }
  }

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
    <div><span>Order #${order.order_number || order.id}</span><span>${order.order_time || ''}</span></div>
    <div><span>Table: ${order.table_no || 'N/A'}</span><span>Pay: ${order.payment_method || 'Cash'}</span></div>
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
    ${discountDisplay}
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
