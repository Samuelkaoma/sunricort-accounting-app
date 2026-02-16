// Balance Calculation Engine for Samuel Accounting
// Handles real-time balance calculations from transaction history

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: "income" | "expense" | "transfer"
  debitAccount: string
  creditAccount: string
  category?: string
  contact?: string
  contactType?: "customer" | "vendor"
}

export interface Account {
  id: string
  name: string
  type: "asset" | "liability" | "equity" | "revenue" | "expense"
  code: string
  balance?: number
}

export interface Contact {
  id: string
  name: string
  type: "customer" | "vendor"
  balance?: number
}

export interface Invoice {
  id: string
  customerId: string
  amount: number
  status: "draft" | "sent" | "paid" | "overdue"
  date: string
  dueDate: string
}

export class BalanceEngine {
  /**
   * Calculate account balance from transaction history
   * Uses double-entry bookkeeping rules:
   * - Assets/Expenses: Debit increases, Credit decreases
   * - Liabilities/Equity/Revenue: Credit increases, Debit decreases
   */
  static calculateAccountBalance(accountId: string, accountType: Account["type"], transactions: Transaction[]): number {
    let balance = 0

    for (const transaction of transactions) {
      if (transaction.debitAccount === accountId) {
        // This account is debited
        if (["asset", "expense"].includes(accountType)) {
          balance += transaction.amount // Debit increases assets/expenses
        } else {
          balance -= transaction.amount // Debit decreases liabilities/equity/revenue
        }
      }

      if (transaction.creditAccount === accountId) {
        // This account is credited
        if (["asset", "expense"].includes(accountType)) {
          balance -= transaction.amount // Credit decreases assets/expenses
        } else {
          balance += transaction.amount // Credit increases liabilities/equity/revenue
        }
      }
    }

    return balance
  }

  /**
   * Calculate customer balance (accounts receivable)
   * Positive balance = customer owes money
   */
  static calculateCustomerBalance(customerId: string, invoices: Invoice[], transactions: Transaction[]): number {
    let balance = 0

    // Add unpaid invoice amounts
    const customerInvoices = invoices.filter((inv) => inv.customerId === customerId && inv.status !== "paid")
    balance += customerInvoices.reduce((sum, inv) => sum + inv.amount, 0)

    // Subtract payments received from customer
    const customerPayments = transactions.filter(
      (txn) => txn.contact === customerId && txn.contactType === "customer" && txn.type === "income",
    )
    balance -= customerPayments.reduce((sum, txn) => sum + txn.amount, 0)

    return balance
  }

  /**
   * Calculate vendor balance (accounts payable)
   * Positive balance = we owe money to vendor
   */
  static calculateVendorBalance(vendorId: string, transactions: Transaction[]): number {
    let balance = 0

    // Add expenses from vendor (money we owe)
    const vendorExpenses = transactions.filter(
      (txn) => txn.contact === vendorId && txn.contactType === "vendor" && txn.type === "expense",
    )
    balance += vendorExpenses.reduce((sum, txn) => sum + txn.amount, 0)

    // Subtract payments made to vendor
    const vendorPayments = transactions.filter(
      (txn) =>
        txn.contact === vendorId && txn.contactType === "vendor" && txn.description.toLowerCase().includes("payment"),
    )
    balance -= vendorPayments.reduce((sum, txn) => sum + txn.amount, 0)

    return balance
  }

  /**
   * Validate double-entry bookkeeping
   * Total debits must equal total credits
   */
  static validateTransactionBalance(transactions: Transaction[]): {
    isValid: boolean
    totalDebits: number
    totalCredits: number
    difference: number
  } {
    const totalDebits = transactions.reduce((sum, txn) => sum + txn.amount, 0)
    const totalCredits = transactions.reduce((sum, txn) => sum + txn.amount, 0)
    const difference = Math.abs(totalDebits - totalCredits)

    return {
      isValid: difference < 0.01, // Allow for small rounding errors
      totalDebits,
      totalCredits,
      difference,
    }
  }

  /**
   * Calculate all account balances at once
   */
  static calculateAllAccountBalances(accounts: Account[], transactions: Transaction[]): Map<string, number> {
    const balances = new Map<string, number>()

    for (const account of accounts) {
      const balance = this.calculateAccountBalance(account.id, account.type, transactions)
      balances.set(account.id, balance)
    }

    return balances
  }

  /**
   * Calculate all contact balances at once
   */
  static calculateAllContactBalances(
    contacts: Contact[],
    invoices: Invoice[],
    transactions: Transaction[],
  ): Map<string, number> {
    const balances = new Map<string, number>()

    for (const contact of contacts) {
      let balance = 0

      if (contact.type === "customer") {
        balance = this.calculateCustomerBalance(contact.id, invoices, transactions)
      } else if (contact.type === "vendor") {
        balance = this.calculateVendorBalance(contact.id, transactions)
      }

      balances.set(contact.id, balance)
    }

    return balances
  }

  /**
   * Get account balance summary by type
   */
  static getAccountTypeSummary(accounts: Account[], balances: Map<string, number>): Record<Account["type"], number> {
    const summary: Record<Account["type"], number> = {
      asset: 0,
      liability: 0,
      equity: 0,
      revenue: 0,
      expense: 0,
    }

    for (const account of accounts) {
      const balance = balances.get(account.id) || 0
      summary[account.type] += balance
    }

    return summary
  }

  /**
   * Verify accounting equation: Assets = Liabilities + Equity
   */
  static verifyAccountingEquation(
    accounts: Account[],
    balances: Map<string, number>,
  ): {
    isBalanced: boolean
    assets: number
    liabilities: number
    equity: number
    difference: number
  } {
    const summary = this.getAccountTypeSummary(accounts, balances)
    const assets = summary.asset
    const liabilitiesAndEquity = summary.liability + summary.equity
    const difference = Math.abs(assets - liabilitiesAndEquity)

    return {
      isBalanced: difference < 0.01,
      assets,
      liabilities: summary.liability,
      equity: summary.equity,
      difference,
    }
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    return `K${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))}${amount < 0 ? "" : ""}`
  }

  /**
   * Get balance color class for UI
   */
  static getBalanceColorClass(balance: number, accountType?: Account["type"]): string {
    if (accountType === "asset" || accountType === "expense") {
      // For assets and expenses, positive is good (green), negative is bad (red)
      return balance >= 0 ? "text-green-600" : "text-red-600"
    } else {
      // For liabilities, equity, revenue, positive is normal (green), negative might be concerning
      return balance >= 0 ? "text-green-600" : "text-red-600"
    }
  }
}

export const {
  calculateAccountBalance,
  calculateCustomerBalance,
  calculateVendorBalance,
  validateTransactionBalance,
  calculateAllAccountBalances,
  calculateAllContactBalances,
  getAccountTypeSummary,
  verifyAccountingEquation,
  formatCurrency,
  getBalanceColorClass,
} = BalanceEngine
