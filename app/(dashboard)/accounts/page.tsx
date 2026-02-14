import { AccountsManagement } from "@/components/accounts-management"
import { getAccounts, getAccountsSummary } from "@/lib/actions/accounts"

export default async function AccountsPage() {
  const [accountsResult, summaryResult] = await Promise.all([getAccounts(), getAccountsSummary()])

  const initialAccounts = accountsResult.success ? (accountsResult.data ?? []) : []
  const initialSummary = summaryResult.success ? summaryResult.data : null

  return <AccountsManagement initialAccounts={initialAccounts} initialSummary={initialSummary} />
}
