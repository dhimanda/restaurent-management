"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const Database = require("better-sqlite3");
const fs = require("fs");
const DEFAULT_CATEGORIES = [
  { name: "Appetizer", sort_order: 1 },
  { name: "Main Course", sort_order: 2 },
  { name: "Beverage", sort_order: 3 },
  { name: "Dessert", sort_order: 4 },
  { name: "Special", sort_order: 5 }
];
const DEFAULT_SETTINGS = {
  restaurant_name: "My Restaurant",
  restaurant_address: "123 Main Street",
  restaurant_phone: "+1 (555) 000-0000",
  restaurant_logo: "",
  currency_symbol: "$",
  locale: "en-US",
  tax_rate: "5",
  receipt_format: "a4",
  google_drive_connected: "false",
  last_sync_time: "",
  theme: "dark",
  initial_fund: "0"
};
const DEFAULT_PAYMENT_METHODS = [
  { label: "Cash", sort_order: 1 },
  { label: "Card", sort_order: 2 },
  { label: "Mobile Banking", sort_order: 3 },
  { label: "Other", sort_order: 4 }
];
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Raw Materials", sort_order: 1 },
  { name: "Utilities", sort_order: 2 },
  { name: "Assets & Equipment", sort_order: 3 },
  { name: "Salaries", sort_order: 4 },
  { name: "Maintenance", sort_order: 5 },
  { name: "Other", sort_order: 6 }
];
function seedDatabase(db) {
  const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get();
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)");
    const insertMany = db.transaction(() => {
      for (const cat of DEFAULT_CATEGORIES) {
        insertCategory.run(cat.name, cat.sort_order);
      }
    });
    insertMany();
  }
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get();
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    const insertMany = db.transaction(() => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insertSetting.run(key, value);
      }
    });
    insertMany();
  } else {
    const insertOrIgnore = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    insertOrIgnore.run("theme", "dark");
    insertOrIgnore.run("initial_fund", "0");
  }
  const pmCount = db.prepare("SELECT COUNT(*) as count FROM payment_methods").get();
  if (pmCount.count === 0) {
    const insertPm = db.prepare("INSERT INTO payment_methods (label, sort_order) VALUES (?, ?)");
    const insertMany = db.transaction(() => {
      for (const pm of DEFAULT_PAYMENT_METHODS) {
        insertPm.run(pm.label, pm.sort_order);
      }
    });
    insertMany();
  }
  const ecCount = db.prepare("SELECT COUNT(*) as count FROM expense_categories").get();
  if (ecCount.count === 0) {
    const insertEc = db.prepare("INSERT INTO expense_categories (name, sort_order) VALUES (?, ?)");
    const insertMany = db.transaction(() => {
      for (const ec of DEFAULT_EXPENSE_CATEGORIES) {
        insertEc.run(ec.name, ec.sort_order);
      }
    });
    insertMany();
  }
}
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  cost_price REAL,
  description TEXT,
  image_path TEXT,
  availability INTEGER DEFAULT 1,
  tags TEXT,
  tax_rate REAL,
  preparation_time INTEGER,
  sku TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_availability ON menu_items(availability);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','preparing','served','cancelled')),
  payment_method TEXT DEFAULT 'cash'
    CHECK(payment_method IN ('cash','card','mobile','other')),
  discount_type TEXT CHECK(discount_type IN ('flat','percentage','')),
  discount_value REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  order_time TEXT DEFAULT (datetime('now')),
  served_time TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_time ON orders(order_time);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  category TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fund_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('initial_fund','sales','expense')),
  reference_id INTEGER,
  amount REAL NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;
let dbInstance = null;
function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }
  const dbPath = path.join(electron.app.getPath("userData"), "restaurant.db");
  console.log("Database path:", dbPath);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  seedDatabase(db);
  dbInstance = db;
  return db;
}
function getAllMenuItems(db) {
  return db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    ORDER BY c.sort_order, mi.name
  `).all();
}
function getMenuItemsByCategory(db, categoryId) {
  return db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.category_id = ?
    ORDER BY mi.name
  `).all(categoryId);
}
function getAvailableMenuItems(db) {
  return db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.availability = 1
    ORDER BY c.sort_order, mi.name
  `).all();
}
function createMenuItem(db, item) {
  const stmt = db.prepare(`
    INSERT INTO menu_items (category_id, name, price, cost_price, description, image_path, availability, tags, tax_rate, preparation_time, sku)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    item.category_id,
    item.name,
    item.price,
    item.cost_price || null,
    item.description || null,
    item.image_path || null,
    item.availability !== void 0 ? item.availability : 1,
    item.tags || null,
    item.tax_rate || null,
    item.preparation_time || null,
    item.sku || null
  );
  return { id: result.lastInsertRowid, ...item };
}
function updateMenuItem(db, id, item) {
  const fields = [];
  const values = [];
  if (item.category_id !== void 0) {
    fields.push("category_id = ?");
    values.push(item.category_id);
  }
  if (item.name !== void 0) {
    fields.push("name = ?");
    values.push(item.name);
  }
  if (item.price !== void 0) {
    fields.push("price = ?");
    values.push(item.price);
  }
  if (item.cost_price !== void 0) {
    fields.push("cost_price = ?");
    values.push(item.cost_price);
  }
  if (item.description !== void 0) {
    fields.push("description = ?");
    values.push(item.description);
  }
  if (item.image_path !== void 0) {
    fields.push("image_path = ?");
    values.push(item.image_path);
  }
  if (item.availability !== void 0) {
    fields.push("availability = ?");
    values.push(item.availability);
  }
  if (item.tags !== void 0) {
    fields.push("tags = ?");
    values.push(item.tags);
  }
  if (item.tax_rate !== void 0) {
    fields.push("tax_rate = ?");
    values.push(item.tax_rate);
  }
  if (item.preparation_time !== void 0) {
    fields.push("preparation_time = ?");
    values.push(item.preparation_time);
  }
  if (item.sku !== void 0) {
    fields.push("sku = ?");
    values.push(item.sku);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  const sql = `UPDATE menu_items SET ${fields.join(", ")} WHERE id = ?`;
  return db.prepare(sql).run(...values);
}
function deleteMenuItem(db, id) {
  return db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
}
function toggleMenuItemAvailability(db, id) {
  return db.prepare(`
    UPDATE menu_items
    SET availability = CASE WHEN availability = 1 THEN 0 ELSE 1 END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
}
function getAllCategories(db) {
  return db.prepare("SELECT * FROM categories ORDER BY sort_order").all();
}
function createCategory(db, name) {
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM categories").get();
  const result = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(name, maxOrder.next_order);
  return { id: result.lastInsertRowid, name, sort_order: maxOrder.next_order };
}
function registerMenuHandlers(db) {
  electron.ipcMain.handle("menu:getAll", () => {
    return getAllMenuItems(db);
  });
  electron.ipcMain.handle("menu:getByCategory", (_event, categoryId) => {
    return getMenuItemsByCategory(db, categoryId);
  });
  electron.ipcMain.handle("menu:getAvailable", () => {
    return getAvailableMenuItems(db);
  });
  electron.ipcMain.handle("menu:create", (_event, item) => {
    return createMenuItem(db, item);
  });
  electron.ipcMain.handle("menu:update", (_event, id, item) => {
    return updateMenuItem(db, id, item);
  });
  electron.ipcMain.handle("menu:delete", (_event, id) => {
    return deleteMenuItem(db, id);
  });
  electron.ipcMain.handle("menu:toggleAvailability", (_event, id) => {
    return toggleMenuItemAvailability(db, id);
  });
  electron.ipcMain.handle("categories:getAll", () => {
    return getAllCategories(db);
  });
  electron.ipcMain.handle("categories:create", (_event, name) => {
    return createCategory(db, name);
  });
}
function getFundBalance(db) {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('initial_fund','sales') THEN amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
    FROM fund_transactions
  `).get();
  return row ? row.balance : 0;
}
function addFundTransaction(db, type, amount, referenceId, note) {
  db.prepare(`
    INSERT INTO fund_transactions (type, reference_id, amount, note)
    VALUES (?, ?, ?, ?)
  `).run(type, referenceId, amount, note);
}
function getFundTransactions(db, limit = 50) {
  return db.prepare(`
    SELECT * FROM fund_transactions
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}
function setInitialFund(db, amount) {
  db.prepare("DELETE FROM fund_transactions WHERE type = 'initial_fund'").run();
  db.prepare(`
    INSERT INTO fund_transactions (type, reference_id, amount, note)
    VALUES ('initial_fund', NULL, ?, 'Initial capital')
  `).run(amount);
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_fund', ?)").run(String(amount));
}
function createOrder(db, order) {
  const defaultTaxRate = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get();
  const taxRate = defaultTaxRate ? parseFloat(defaultTaxRate.value) : 5;
  let subtotal = 0;
  for (const item of order.items) {
    subtotal += item.qty * item.unit_price;
  }
  let discountAmount = 0;
  if (order.discount_value && order.discount_value > 0) {
    if (order.discount_type === "percentage") {
      discountAmount = subtotal * (order.discount_value / 100);
    } else {
      discountAmount = order.discount_value;
    }
  }
  const afterDiscount = subtotal - discountAmount;
  const taxTotal = afterDiscount * (taxRate / 100);
  const grandTotal = afterDiscount + taxTotal;
  const insertOrder = db.prepare(`
    INSERT INTO orders (table_no, status, payment_method, discount_type, discount_value, subtotal, tax_total, grand_total, notes)
    VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, qty, unit_price, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = db.transaction(() => {
    const orderResult = insertOrder.run(
      order.table_no || "",
      order.payment_method || "cash",
      order.discount_type || "",
      order.discount_value || 0,
      Math.round(subtotal * 100) / 100,
      Math.round(taxTotal * 100) / 100,
      Math.round(grandTotal * 100) / 100,
      order.notes || ""
    );
    const orderId = orderResult.lastInsertRowid;
    for (const item of order.items) {
      insertItem.run(
        orderId,
        item.menu_item_id,
        item.name,
        item.qty,
        item.unit_price,
        item.notes || ""
      );
    }
    return orderId;
  })();
  return { id: result, subtotal, tax_total: taxTotal, grand_total: grandTotal };
}
function getActiveOrders(db) {
  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT SUM(qty) FROM order_items oi WHERE oi.order_id = o.id) as total_items
    FROM orders o
    WHERE o.status IN ('pending', 'preparing')
    ORDER BY o.order_time ASC
  `).all();
  return orders;
}
function getAllOrders(db, filters) {
  let sql = `
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT SUM(qty) FROM order_items oi WHERE oi.order_id = o.id) as total_items
    FROM orders o
    WHERE 1=1
  `;
  const params = [];
  if (filters && filters.status) {
    sql += " AND o.status = ?";
    params.push(filters.status);
  }
  if (filters && filters.from) {
    sql += " AND o.order_time >= ?";
    params.push(filters.from);
  }
  if (filters && filters.to) {
    sql += " AND o.order_time <= ?";
    params.push(filters.to);
  }
  sql += " ORDER BY o.order_time DESC";
  return db.prepare(sql).all(...params);
}
function getOrderById(db, id) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) return null;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id);
  return { ...order, items };
}
function updateOrderStatus(db, id, status) {
  let sql = "UPDATE orders SET status = ?";
  const params = [status];
  if (status === "served") {
    sql += ", served_time = datetime('now')";
  }
  sql += " WHERE id = ?";
  params.push(id);
  const result = db.prepare(sql).run(...params);
  if (status === "served") {
    const order = db.prepare("SELECT grand_total FROM orders WHERE id = ?").get(id);
    if (order) {
      addFundTransaction(db, "sales", order.grand_total, id, "Order #" + id + " payment");
    }
  }
  return result;
}
function cancelOrder(db, id) {
  return db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
}
function registerOrderHandlers(db) {
  electron.ipcMain.handle("orders:create", (_event, order) => {
    return createOrder(db, order);
  });
  electron.ipcMain.handle("orders:getActive", () => {
    return getActiveOrders(db);
  });
  electron.ipcMain.handle("orders:getAll", (_event, filters) => {
    return getAllOrders(db, filters);
  });
  electron.ipcMain.handle("orders:getById", (_event, id) => {
    return getOrderById(db, id);
  });
  electron.ipcMain.handle("orders:updateStatus", (_event, id, status) => {
    return updateOrderStatus(db, id, status);
  });
  electron.ipcMain.handle("orders:cancel", (_event, id) => {
    return cancelOrder(db, id);
  });
}
function getDailySummary(db, date) {
  const dateStart = date + " 00:00:00";
  const dateEnd = date + " 23:59:59";
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(grand_total), 0) as total_revenue,
      COALESCE(AVG(grand_total), 0) as avg_order_value,
      COALESCE(SUM(tax_total), 0) as total_tax,
      COALESCE(SUM(CASE WHEN discount_value > 0 THEN
        CASE WHEN discount_type = 'percentage' THEN subtotal * (discount_value / 100) ELSE discount_value END
      ELSE 0 END), 0) as total_discounts
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
  `).get(dateStart, dateEnd);
  const totalItemsSold = db.prepare(`
    SELECT COALESCE(SUM(oi.qty), 0) as total
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_time BETWEEN ? AND ?
    AND o.status != 'cancelled'
  `).get(dateStart, dateEnd);
  const topItemsByQty = db.prepare(`
    SELECT oi.name, SUM(oi.qty) as total_qty, SUM(oi.qty * oi.unit_price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_time BETWEEN ? AND ?
    AND o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_qty DESC
    LIMIT 5
  `).all(dateStart, dateEnd);
  const paymentBreakdown = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(grand_total) as total
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
    GROUP BY payment_method
  `).all(dateStart, dateEnd);
  return {
    ...summary,
    total_items_sold: totalItemsSold.total,
    top_items: topItemsByQty,
    payment_breakdown: paymentBreakdown
  };
}
function getDateRangeReport(db, from, to) {
  const dateStart = from + " 00:00:00";
  const dateEnd = to + " 23:59:59";
  const dailyRevenue = db.prepare(`
    SELECT DATE(order_time) as date,
      COUNT(*) as orders,
      SUM(grand_total) as revenue
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
    GROUP BY DATE(order_time)
    ORDER BY date
  `).all(dateStart, dateEnd);
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(grand_total), 0) as total_revenue,
      COALESCE(AVG(grand_total), 0) as avg_order_value
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
  `).get(dateStart, dateEnd);
  const orders = db.prepare(`
    SELECT id, table_no, status, payment_method, grand_total, order_time
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    ORDER BY order_time DESC
  `).all(dateStart, dateEnd);
  return { daily_revenue: dailyRevenue, summary, orders };
}
function getItemPerformance(db, from, to) {
  const dateStart = from + " 00:00:00";
  const dateEnd = to + " 23:59:59";
  return db.prepare(`
    SELECT
      oi.name,
      COUNT(DISTINCT oi.order_id) as order_count,
      SUM(oi.qty) as total_qty,
      SUM(oi.qty * oi.unit_price) as total_revenue,
      ROUND(AVG(oi.unit_price), 2) as avg_price
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_time BETWEEN ? AND ?
    AND o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_revenue DESC
  `).all(dateStart, dateEnd);
}
function getPaymentBreakdown(db, from, to) {
  const dateStart = from + " 00:00:00";
  const dateEnd = to + " 23:59:59";
  return db.prepare(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
    GROUP BY payment_method
  `).all(dateStart, dateEnd);
}
function registerReportHandlers(db) {
  electron.ipcMain.handle("reports:dailySummary", (_event, date) => {
    return getDailySummary(db, date);
  });
  electron.ipcMain.handle("reports:dateRange", (_event, from, to) => {
    return getDateRangeReport(db, from, to);
  });
  electron.ipcMain.handle("reports:itemPerformance", (_event, from, to) => {
    return getItemPerformance(db, from, to);
  });
  electron.ipcMain.handle("reports:paymentBreakdown", (_event, from, to) => {
    return getPaymentBreakdown(db, from, to);
  });
}
function getAllSettings(db) {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}
function setSetting(db, key, value) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
function setMultipleSettings(db, settings) {
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  const insertMany = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
  });
  insertMany();
}
function getAllPaymentMethods(db) {
  return db.prepare("SELECT * FROM payment_methods ORDER BY sort_order, label").all();
}
function createPaymentMethod(db, label) {
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as m FROM payment_methods").get();
  const result = db.prepare("INSERT INTO payment_methods (label, sort_order) VALUES (?, ?)").run(label, maxOrder.m + 1);
  return db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(result.lastInsertRowid);
}
function updatePaymentMethod(db, id, label) {
  db.prepare("UPDATE payment_methods SET label = ? WHERE id = ?").run(label, id);
}
function deletePaymentMethod(db, id) {
  db.prepare("DELETE FROM payment_methods WHERE id = ?").run(id);
}
function getAllExpenseCategories(db) {
  return db.prepare("SELECT * FROM expense_categories ORDER BY sort_order, name").all();
}
function createExpenseCategory(db, name) {
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as m FROM expense_categories").get();
  const result = db.prepare("INSERT INTO expense_categories (name, sort_order) VALUES (?, ?)").run(name, maxOrder.m + 1);
  return db.prepare("SELECT * FROM expense_categories WHERE id = ?").get(result.lastInsertRowid);
}
function updateExpenseCategory(db, id, name) {
  db.prepare("UPDATE expense_categories SET name = ? WHERE id = ?").run(name, id);
}
function deleteExpenseCategory(db, id) {
  db.prepare("DELETE FROM expense_categories WHERE id = ?").run(id);
}
function registerSettingsHandlers(db) {
  electron.ipcMain.handle("settings:getAll", () => {
    return getAllSettings(db);
  });
  electron.ipcMain.handle("settings:set", (_event, key, value) => {
    setSetting(db, key, value);
    return { success: true };
  });
  electron.ipcMain.handle("settings:setMultiple", (_event, settings) => {
    setMultipleSettings(db, settings);
    return { success: true };
  });
  electron.ipcMain.handle("paymentMethods:getAll", () => {
    return getAllPaymentMethods(db);
  });
  electron.ipcMain.handle("paymentMethods:create", (_event, label) => {
    return createPaymentMethod(db, label);
  });
  electron.ipcMain.handle("paymentMethods:update", (_event, id, label) => {
    updatePaymentMethod(db, id, label);
    return { success: true };
  });
  electron.ipcMain.handle("paymentMethods:delete", (_event, id) => {
    deletePaymentMethod(db, id);
    return { success: true };
  });
  electron.ipcMain.handle("expenseCategories:getAll", () => {
    return getAllExpenseCategories(db);
  });
  electron.ipcMain.handle("expenseCategories:create", (_event, name) => {
    return createExpenseCategory(db, name);
  });
  electron.ipcMain.handle("expenseCategories:update", (_event, id, name) => {
    updateExpenseCategory(db, id, name);
    return { success: true };
  });
  electron.ipcMain.handle("expenseCategories:delete", (_event, id) => {
    deleteExpenseCategory(db, id);
    return { success: true };
  });
}
function createExpense(db, input) {
  const insertExpense = db.prepare(`
    INSERT INTO expenses (date, amount, payment_method, category, note)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = db.transaction(() => {
    const row = insertExpense.run(
      input.date,
      input.amount,
      input.payment_method,
      input.category,
      input.note || null
    );
    const expenseId = Number(row.lastInsertRowid);
    addFundTransaction(db, "expense", input.amount, expenseId, input.category);
    return expenseId;
  })();
  return getExpenseById(db, result);
}
function getExpenseById(db, id) {
  return db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
}
function getAllExpenses(db, filters) {
  let sql = "SELECT * FROM expenses WHERE 1=1";
  const params = [];
  if (filters && filters.from) {
    sql += " AND date >= ?";
    params.push(filters.from);
  }
  if (filters && filters.to) {
    sql += " AND date <= ?";
    params.push(filters.to);
  }
  if (filters && filters.category) {
    sql += " AND category = ?";
    params.push(filters.category);
  }
  sql += " ORDER BY date DESC, created_at DESC";
  return db.prepare(sql).all(...params);
}
function updateExpense(db, id, input) {
  const old = getExpenseById(db, id);
  if (!old) return;
  db.transaction(() => {
    db.prepare(`
      UPDATE expenses SET date=?, amount=?, payment_method=?, category=?, note=?
      WHERE id=?
    `).run(input.date, input.amount, input.payment_method, input.category, input.note || null, id);
    const diff = input.amount - old.amount;
    if (diff !== 0) {
      addFundTransaction(
        db,
        "expense",
        diff,
        id,
        "Expense adjustment: " + input.category
      );
    }
  })();
}
function deleteExpense(db, id) {
  const expense = getExpenseById(db, id);
  if (!expense) return;
  db.transaction(() => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
    addFundTransaction(db, "expense", -expense.amount, id, "Expense deleted: " + expense.category);
  })();
}
function getExpenseSummary(db, from, to) {
  const total = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses
    WHERE date BETWEEN ? AND ?
  `).get(from, to);
  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY total DESC
  `).all(from, to);
  return { total, byCategory };
}
function rowsToCsv(headers, rows) {
  const escape = (val) => {
    const s = val == null ? "" : String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\r\n");
}
function registerSyncHandlers(db) {
  electron.ipcMain.handle("sync:exportDb", async () => {
    const result = await electron.dialog.showSaveDialog({
      title: "Export Database Backup",
      defaultPath: path.join(electron.app.getPath("documents"), `restaurant-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`),
      filters: [
        { name: "SQLite Database", extensions: ["db"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, message: "Export cancelled" };
    }
    try {
      const sourcePath = path.join(electron.app.getPath("userData"), "restaurant.db");
      fs.copyFileSync(sourcePath, result.filePath);
      return { success: true, message: "Database exported successfully", path: result.filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: "Export failed: " + errorMessage };
    }
  });
  electron.ipcMain.handle("sync:exportCsv", async (_event, type, from, to) => {
    let csv = "";
    let defaultName = "export";
    if (type === "orders") {
      const report = getDateRangeReport(db, from, to);
      const rows = report.orders || [];
      csv = rowsToCsv(["id", "table_no", "status", "payment_method", "grand_total", "order_time"], rows);
      defaultName = "orders-" + from + "-to-" + to;
    } else if (type === "items") {
      const rows = getItemPerformance(db, from, to);
      csv = rowsToCsv(["name", "order_count", "total_qty", "total_revenue", "avg_price"], rows);
      defaultName = "item-performance-" + from + "-to-" + to;
    } else if (type === "expenses") {
      const rows = getAllExpenses(db, { from, to });
      csv = rowsToCsv(["id", "date", "amount", "payment_method", "category", "note"], rows);
      defaultName = "expenses-" + from + "-to-" + to;
    }
    if (!csv) {
      return { success: false, message: "No data to export" };
    }
    const result = await electron.dialog.showSaveDialog({
      title: "Save CSV",
      defaultPath: path.join(electron.app.getPath("documents"), defaultName + ".csv"),
      filters: [{ name: "CSV File", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, message: "Export cancelled" };
    }
    try {
      fs.writeFileSync(result.filePath, csv, "utf-8");
      return { success: true, message: "CSV exported successfully", path: result.filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: "Export failed: " + errorMessage };
    }
  });
  electron.ipcMain.handle("sync:importDb", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "Import Database Backup",
      filters: [
        { name: "SQLite Database", extensions: ["db"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: "Import cancelled" };
    }
    try {
      const sourcePath = result.filePaths[0];
      const destPath = path.join(electron.app.getPath("userData"), "restaurant.db");
      if (!fs.existsSync(sourcePath)) {
        return { success: false, message: "File not found" };
      }
      db.close();
      fs.copyFileSync(sourcePath, destPath);
      return { success: true, message: "Database imported successfully. Please restart the application." };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: "Import failed: " + errorMessage };
    }
  });
  electron.ipcMain.handle("sync:connectDrive", async () => {
    return { success: false, message: "Google Drive sync will be configured in Settings. Please add your OAuth credentials first." };
  });
  electron.ipcMain.handle("sync:syncNow", async () => {
    return { success: false, message: "Google Drive is not connected. Please connect your account first." };
  });
  electron.ipcMain.handle("sync:getStatus", () => {
    return { connected: false, lastSyncTime: null };
  });
}
function registerPrintHandlers(db, getMainWindow) {
  electron.ipcMain.handle("print:bill", async (_event, orderId) => {
    const order = getOrderById(db, orderId);
    if (!order) {
      return { success: false, message: "Order not found" };
    }
    const settings = getAllSettings(db);
    const billHtml = generateBillHtml(order, settings);
    const printWindow = new electron.BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      webPreferences: {
        contextIsolation: true
      }
    });
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(billHtml)}`);
    printWindow.webContents.print({ silent: false, printBackground: true }, (success) => {
      printWindow.close();
    });
    return { success: true };
  });
}
function generateBillHtml(order, settings) {
  const currencySymbol = settings.currency_symbol || "$";
  const items = order.items || [];
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding: 4px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 4px 8px; text-align: center; border-bottom: 1px solid #eee;">${item.qty}</td>
      <td style="padding: 4px 0; text-align: right; border-bottom: 1px solid #eee;">${currencySymbol}${(item.unit_price * item.qty).toFixed(2)}</td>
    </tr>
    ${item.notes ? `<tr><td colspan="3" style="padding: 2px 0 4px 12px; font-size: 11px; color: #888; font-style: italic;">Note: ${item.notes}</td></tr>` : ""}
  `).join("");
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
    <h1>${settings.restaurant_name || "Restaurant"}</h1>
    <p>${settings.restaurant_address || ""}</p>
    <p>${settings.restaurant_phone || ""}</p>
  </div>

  <div class="meta">
    <div><span>Order #${order.id}</span><span>${order.order_time || ""}</span></div>
    <div><span>Table: ${order.table_no || "N/A"}</span><span>Pay: ${order.payment_method || "cash"}</span></div>
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
    ${order.discount_value > 0 ? `<div><span>Discount${order.discount_type === "percentage" ? " (" + order.discount_value + "%)" : ""}</span><span>-${currencySymbol}${order.discount_type === "percentage" ? (order.subtotal * order.discount_value / 100).toFixed(2) : (order.discount_value || 0).toFixed(2)}</span></div>` : ""}
    <div><span>Tax</span><span>${currencySymbol}${(order.tax_total || 0).toFixed(2)}</span></div>
    <div class="grand-total"><span>TOTAL</span><span>${currencySymbol}${(order.grand_total || 0).toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for dining with us!</p>
    <p>Please come again</p>
  </div>
</body>
</html>`;
}
function registerExpenseHandlers(db) {
  electron.ipcMain.handle("expenses:create", (_event, input) => {
    return createExpense(db, input);
  });
  electron.ipcMain.handle("expenses:getAll", (_event, filters) => {
    return getAllExpenses(db, filters);
  });
  electron.ipcMain.handle("expenses:update", (_event, id, input) => {
    updateExpense(db, id, input);
    return { success: true };
  });
  electron.ipcMain.handle("expenses:delete", (_event, id) => {
    deleteExpense(db, id);
    return { success: true };
  });
  electron.ipcMain.handle("expenses:getSummary", (_event, from, to) => {
    return getExpenseSummary(db, from, to);
  });
}
function registerFundHandlers(db) {
  electron.ipcMain.handle("fund:getBalance", () => {
    return { balance: getFundBalance(db) };
  });
  electron.ipcMain.handle("fund:setInitial", (_event, amount) => {
    setInitialFund(db, amount);
    return { success: true, balance: getFundBalance(db) };
  });
  electron.ipcMain.handle("fund:getTransactions", (_event, limit) => {
    return getFundTransactions(db, limit);
  });
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: "Restaurant Manager",
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.restaurant.app");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  const db = initDatabase();
  registerMenuHandlers(db);
  registerOrderHandlers(db);
  registerReportHandlers(db);
  registerSettingsHandlers(db);
  registerSyncHandlers(db);
  registerPrintHandlers(db);
  registerExpenseHandlers(db);
  registerFundHandlers(db);
  electron.ipcMain.handle("menu:pickImage", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
