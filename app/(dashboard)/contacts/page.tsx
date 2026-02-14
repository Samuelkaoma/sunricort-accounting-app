import { ContactManagement } from "@/components/contact-management"
import { getContacts, getContactsSummary } from "@/lib/actions/contacts"

export default async function ContactsPage() {
  // Fetch all data in parallel on the server
  const [contactsResult, summaryResult] = await Promise.all([getContacts(), getContactsSummary()])

  const contacts = contactsResult.success ? contactsResult.data || [] : []
  const summary = summaryResult.success ? summaryResult.data! : null

  return <ContactManagement initialContacts={contacts} initialSummary={summary} />
}
