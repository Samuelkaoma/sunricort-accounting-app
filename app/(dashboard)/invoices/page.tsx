import { InvoiceManagement } from "@/components/invoice-management"
import { getInvoices, getCustomers } from "@/lib/actions/invoices"
import { getAccounts } from "@/lib/actions/accounts"

export default async function InvoicesPage() {
  const [invoicesResult, customersResult, accountsResult] = await Promise.all([
    getInvoices(),
    getCustomers(),
    getAccounts(),
  ])

  const invoices = invoicesResult.success ? invoicesResult.data! : []
  const customers = customersResult.success ? customersResult.data! : []
  const accounts = accountsResult.success ? accountsResult.data! : []

  return <InvoiceManagement initialInvoices={invoices} initialCustomers={customers} initialAccounts={accounts} />
}
