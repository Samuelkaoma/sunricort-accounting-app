import { TransactionManagement } from "@/components/transaction-management"
import { getTransactions, getAccounts } from "@/lib/actions/transactions"
import { getContacts } from "@/lib/actions/contacts"

export default async function TransactionsPage() {
  const [transactionsResult, accountsResult, contactsResult] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getContacts(),
  ])

  const initialTransactions = transactionsResult.success ? transactionsResult.data! : []
  const initialAccounts = accountsResult.success ? accountsResult.data! : []
  const initialContacts = contactsResult.success ? contactsResult.data! : []

  return (
    <TransactionManagement
      initialTransactions={initialTransactions}
      initialAccounts={initialAccounts}
      initialContacts={initialContacts}
    />
  )
}
