import Database from 'better-sqlite3'
import { addFundTransaction } from './fund-queries'

export interface ExpenseInput {
  date: string
  amount: number
  payment_method: string
  category: string
  note?: string
}

export interface Expense {
  id: number
  date: string
  amount: number
  payment_method: string
  category: string
  note: string | null
  created_at: string
}

export function createExpense(db: Database.Database, input: ExpenseInput): Expense {
  const insertExpense = db.prepare(`
    INSERT INTO expenses (date, amount, payment_method, category, note)
    VALUES (?, ?, ?, ?, ?)
  `)

  const result = db.transaction(() => {
    const row = insertExpense.run(
      input.date,
      input.amount,
      input.payment_method,
      input.category,
      input.note || null
    )
    const expenseId = Number(row.lastInsertRowid)

    // Debit fund balance
    addFundTransaction(db, 'expense', input.amount, expenseId, input.category)

    return expenseId
  })()

  return getExpenseById(db, result) as Expense
}

export function getExpenseById(db: Database.Database, id: number): Expense | null {
  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense | null
}

export function getAllExpenses(
  db: Database.Database,
  filters?: { from?: string; to?: string; category?: string }
): Expense[] {
  let sql = 'SELECT * FROM expenses WHERE 1=1'
  const params: unknown[] = []

  if (filters && filters.from) {
    sql += ' AND date >= ?'
    params.push(filters.from)
  }
  if (filters && filters.to) {
    sql += ' AND date <= ?'
    params.push(filters.to)
  }
  if (filters && filters.category) {
    sql += ' AND category = ?'
    params.push(filters.category)
  }

  sql += ' ORDER BY date DESC, created_at DESC'
  return db.prepare(sql).all(...params) as Expense[]
}

export function updateExpense(db: Database.Database, id: number, input: ExpenseInput): void {
  const old = getExpenseById(db, id)
  if (!old) return

  db.transaction(() => {
    db.prepare(`
      UPDATE expenses SET date=?, amount=?, payment_method=?, category=?, note=?
      WHERE id=?
    `).run(input.date, input.amount, input.payment_method, input.category, input.note || null, id)

    // Adjust fund: reverse the old debit and apply the new one
    const diff = input.amount - old.amount
    if (diff !== 0) {
      addFundTransaction(
        db,
        'expense',
        diff,
        id,
        'Expense adjustment: ' + input.category
      )
    }
  })()
}

export function deleteExpense(db: Database.Database, id: number): void {
  const expense = getExpenseById(db, id)
  if (!expense) return

  db.transaction(() => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    // Reverse the debit by adding a negative expense entry
    addFundTransaction(db, 'expense', -expense.amount, id, 'Expense deleted: ' + expense.category)
  })()
}

export function getExpenseSummary(db: Database.Database, from: string, to: string) {
  const total = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses
    WHERE date BETWEEN ? AND ?
  `).get(from, to) as { total: number; count: number }

  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY total DESC
  `).all(from, to)

  return { total, byCategory }
}
