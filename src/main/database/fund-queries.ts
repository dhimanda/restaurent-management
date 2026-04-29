import Database from 'better-sqlite3'

export interface FundTransaction {
  id: number
  type: 'initial_fund' | 'sales' | 'expense'
  reference_id: number | null
  amount: number
  note: string | null
  created_at: string
}

export function getFundBalance(db: Database.Database): number {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('initial_fund','sales') THEN amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
    FROM fund_transactions
  `).get() as { balance: number }
  return row ? row.balance : 0
}

export function addFundTransaction(
  db: Database.Database,
  type: 'initial_fund' | 'sales' | 'expense',
  amount: number,
  referenceId: number | null,
  note: string | null
): void {
  db.prepare(`
    INSERT INTO fund_transactions (type, reference_id, amount, note)
    VALUES (?, ?, ?, ?)
  `).run(type, referenceId, amount, note)
}

export function getFundTransactions(db: Database.Database, limit: number = 50): FundTransaction[] {
  return db.prepare(`
    SELECT * FROM fund_transactions
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as FundTransaction[]
}

export function setInitialFund(db: Database.Database, amount: number): void {
  // Remove any previous initial_fund entries then insert a fresh one
  db.prepare("DELETE FROM fund_transactions WHERE type = 'initial_fund'").run()
  db.prepare(`
    INSERT INTO fund_transactions (type, reference_id, amount, note)
    VALUES ('initial_fund', NULL, ?, 'Initial capital')
  `).run(amount)

  // Also store in settings for quick display
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_fund', ?)").run(String(amount))
}
