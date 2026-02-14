import { RecurringTransactionManagement } from "@/components/recurring-transaction-management"
import { getRecurringTransactions } from "@/lib/actions/recurring"
import { getAccounts } from "@/lib/actions/accounts"
import { getCustomers, getVendors } from "@/lib/actions/contacts"

export default async function RecurringPage() {
  // Fetch all data in parallel on the server
  const [transactionsResult, accountsResult, customersResult, vendorsResult] = await Promise.all([
    getRecurringTransactions(),
    getAccounts(),
    getCustomers(),
    getVendors(),
  ])

  const recurringTransactions = transactionsResult.success ? transactionsResult.data || [] : []
  const accounts = accountsResult.success ? accountsResult.data! || [] : []
  const customers = customersResult.success ? customersResult.data! || [] : []
  const vendors = vendorsResult.success ? vendorsResult.data! || [] : []

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Recurring Transactions</h2>
      </div>
      <RecurringTransactionManagement
        initialRecurringTransactions={recurringTransactions}
        initialAccounts={accounts}
        initialCustomers={customers}
        initialVendors={vendors}
      />
    </div>
  )
}
