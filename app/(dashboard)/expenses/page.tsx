import { ExpenseManagement } from "@/components/expense-management"
import { getExpenses, getVendors, getAccounts } from "@/lib/actions/expenses"

export default async function ExpensesPage() {
  // Fetch all data in parallel on the server
  const [expensesResult, vendorsResult, accountsResult] = await Promise.all([
    getExpenses(),
    getVendors(),
    getAccounts(),
  ])

  const expenses = expensesResult.success ? expensesResult.data || [] : []
  const vendors = vendorsResult.success ? vendorsResult.data || [] : []
  const accounts = accountsResult.success ? accountsResult.data || [] : []

  return <ExpenseManagement initialExpenses={expenses} initialVendors={vendors} initialAccounts={accounts} />
}
