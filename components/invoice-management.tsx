"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Send,
  Eye,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import {
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
} from "@/lib/actions/invoices"
import { createTransaction } from "@/lib/actions/transactions"
import { createContact } from "@/lib/actions/contacts"
import type { InvoiceStatus } from "@/db/schema"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { InvoicePDF } from "./invoice-export"
import { pdf } from "@react-pdf/renderer"

// Invoice status types - updated to match database enum
const INVOICE_STATUS = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    icon: FileText,
  },
  sent: {
    label: "Sent",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Send,
  },
  paid: {
    label: "Paid",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: AlertCircle,
  },
} as const

interface LineItem {
  id?: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface InvoiceFormData {
  id?: string
  invoiceNumber?: string
  contactId: string
  customerName: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes: string
  terms: string
  lineItems: LineItem[]
}

// Extended type for display purposes
export interface DisplayInvoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerEmail: string | null
  issueDate: Date
  dueDate: Date
  status: "draft" | "sent" | "paid" | "overdue" | null
  subtotal: string
  taxRate: string | null
  taxAmount: string | null
  total: string
  paidAmount: string | null
  notes: string | null
  terms: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

interface Customer {
  id: string
  name: string
  email: string | null
  address: string | null
}

interface Account {
  id: string
  name: string
  type: string
}

interface InvoiceManagementProps {
  initialInvoices: DisplayInvoice[]
  initialCustomers: Customer[]
  initialAccounts: Account[]
}

export function InvoiceManagement({ initialInvoices, initialCustomers, initialAccounts }: InvoiceManagementProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<DisplayInvoice[]>(initialInvoices)
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<DisplayInvoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<DisplayInvoice | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState<DisplayInvoice | null>(null)
  const [selectedAccount, setSelectedAccount] = useState("")
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  const [formData, setFormData] = useState<InvoiceFormData>({
    contactId: "",
    customerName: "",
    issueDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    status: "draft",
    subtotal: 0,
    taxRate: 8.5,
    taxAmount: 0,
    total: 0,
    notes: "",
    terms: "",
    lineItems: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
  })

  useEffect(() => {
    setInvoices(initialInvoices)
    setCustomers(initialCustomers)
    setAccounts(initialAccounts)
  }, [initialInvoices, initialCustomers, initialAccounts])

  const loadInvoices = () => {
    router.refresh()
  }

  const loadCustomers = () => {
    router.refresh()
  }

  const loadAccounts = () => {
    router.refresh()
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "ALL" || invoice.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = (subtotal * formData.taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newLineItems = [...formData.lineItems]
    newLineItems[index] = { ...newLineItems[index], [field]: value }

    if (field === "quantity" || field === "rate") {
      newLineItems[index].amount = newLineItems[index].quantity * newLineItems[index].rate
    }

    const { subtotal, taxAmount, total } = calculateTotals()
    setFormData({
      ...formData,
      lineItems: newLineItems,
      subtotal,
      taxAmount,
      total,
    })
  }

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: "", quantity: 1, rate: 0, amount: 0 }],
    })
  }

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length > 1) {
      const newLineItems = formData.lineItems.filter((_, i) => i !== index)
      const subtotal = newLineItems.reduce((sum, item) => sum + item.amount, 0)
      const taxAmount = (subtotal * formData.taxRate) / 100
      const total = subtotal + taxAmount
      setFormData({
        ...formData,
        lineItems: newLineItems,
        subtotal,
        taxAmount,
        total,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedCustomer = customers.find((c) => c.id === formData.contactId)
    if (!selectedCustomer) {
      toast.error("Please select a customer")
      return
    }

    if (formData.status === "paid" && !selectedAccount) {
      toast.error("Please select an account for payment when marking invoice as paid")
      return
    }

    try {
      const formDataToSubmit = new FormData()
      formDataToSubmit.append("customerId", formData.contactId)
      formDataToSubmit.append("issueDate", formData.issueDate)
      formDataToSubmit.append("dueDate", formData.dueDate)
      formDataToSubmit.append("status", formData.status)
      formDataToSubmit.append("notes", formData.notes)
      formDataToSubmit.append("terms", formData.terms)
      formDataToSubmit.append("taxRate", formData.taxRate.toString())
      formDataToSubmit.append("items", JSON.stringify(formData.lineItems))

      let result
      if (editingInvoice) {
        result = await updateInvoice(editingInvoice.id, formDataToSubmit)
      } else {
        result = await createInvoice(formDataToSubmit)
      }

      if (result.success) {
        if (formData.status === "paid" && selectedAccount && result.data) {
          const transactionData = new FormData()
          transactionData.append(
            "description",
            `Payment received for Invoice ${result.data.invoiceNumber || "New Invoice"}`,
          )
          transactionData.append("amount", formData.total.toString())
          transactionData.append("type", "income")
          transactionData.append("status", "completed")
          transactionData.append("transactionDate", format(new Date(), "yyyy-MM-dd"))
          transactionData.append("toAccountId", selectedAccount)
          transactionData.append("contactId", formData.contactId)
          transactionData.append("reference", result.data.invoiceNumber || "")

          const transactionResult = await createTransaction(transactionData)
          if (!transactionResult.success) {
            console.warn("Failed to create transaction record:", transactionResult.error)
          }
        }

        toast(editingInvoice ? "Invoice Updated" : "Invoice Created", {
          description: `Invoice has been ${editingInvoice ? "updated" : "created"} successfully.`,
        })
        resetForm()
        loadInvoices()
      } else {
        toast.error(result.error || "Failed to save invoice")
      }
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast.error("Failed to save invoice")
    }
  }

  const resetForm = () => {
    setFormData({
      contactId: "",
      customerName: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      status: "draft",
      subtotal: 0,
      taxRate: 8.5,
      taxAmount: 0,
      total: 0,
      notes: "",
      terms: "",
      lineItems: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
    })
    setEditingInvoice(null)
    setIsDialogOpen(false)
    setSelectedAccount("")
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    // Removed loading state manipulation as it's handled by router.refresh() now.

    try {
      const formDataObj = new FormData()
      formDataObj.append("name", customerFormData.name)
      formDataObj.append("email", customerFormData.email)
      formDataObj.append("phone", customerFormData.phone)
      formDataObj.append("address", customerFormData.address)
      formDataObj.append("type", "customer")

      const result = await createContact(formDataObj)

      if (result.success) {
        toast.success("Customer Created", {
          description: `Customer "${customerFormData.name}" has been created successfully.`,
        })

        // Refresh customers list
        await loadCustomers()

        // Set the newly created customer as selected
        if (result.data) {
          setFormData({
            ...formData,
            contactId: result.data.id,
            customerName: result.data.name,
          })
        }

        resetCustomerForm()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("Error creating customer:", error)
      toast.error("Failed to create customer")
    } finally {
      // Removed loading state manipulation
    }
  }

  const handleEdit = async (invoice: DisplayInvoice) => {
    try {
      const result = await getInvoiceById(invoice.id)
      if (result.success && result.data) {
        const invoiceData = result.data
        const customer = customers.find((c) => c.id === invoice.customerId)

        setEditingInvoice(invoice)
        setFormData({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          contactId: invoice.customerId,
          customerName: customer?.name || "Unknown Customer",
          issueDate: format(new Date(invoice.issueDate), "yyyy-MM-dd"),
          dueDate: format(new Date(invoice.dueDate), "yyyy-MM-dd"),
          status: invoice.status || "draft",
          subtotal: Number.parseFloat(invoice.subtotal || "0"),
          taxRate: Number.parseFloat(invoice.taxRate || "8.5"),
          taxAmount: Number.parseFloat(invoice.taxAmount || "0"),
          total: Number.parseFloat(invoice.total || "0"),
          notes: invoice.notes || "",
          terms: invoice.terms || "",
          lineItems: invoiceData.items?.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number.parseFloat(item.quantity),
            rate: Number.parseFloat(item.unitPrice),
            amount: Number.parseFloat(item.total),
          })) || [{ description: "", quantity: 1, rate: 0, amount: 0 }],
        })
        setSelectedAccount("")
        setIsDialogOpen(true)
      } else {
        toast.error(result.error || "Failed to load invoice details")
      }
    } catch (error) {
      console.error("Error loading invoice details:", error)
      toast.error("Failed to load invoice details")
    }
  }

  const handleView = (invoice: DisplayInvoice) => {
    setViewingInvoice(invoice)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (invoiceId: string) => {
    try {
      const result = await deleteInvoice(invoiceId)
      if (result.success) {
        toast("Invoice Deleted", {
          description: "The invoice has been deleted successfully.",
        })
        loadInvoices()
      } else {
        toast.error(result.error || "Failed to delete invoice")
      }
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast.error("Failed to delete invoice")
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: "draft" | "sent" | "paid" | "overdue") => {
    if (newStatus === "paid") {
      const invoice = invoices.find((i) => i.id === invoiceId)
      if (invoice) {
        setPayingInvoice(invoice)
        setIsPaymentDialogOpen(true)
        return
      }
    }

    try {
      const result = await updateInvoiceStatus(invoiceId, newStatus)
      if (result.success) {
        toast.success("Status Updated", {
          description: `Invoice status has been updated to ${INVOICE_STATUS[newStatus].label}.`,
        })
        loadInvoices()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  const handlePayment = async () => {
    if (!payingInvoice || !selectedAccount) {
      toast.error("Please select an account for payment")
      return
    }

    try {
      const statusResult = await updateInvoiceStatus(payingInvoice.id, "paid")
      if (!statusResult.success) {
        throw new Error(statusResult.error || "Failed to update invoice status")
      }

      const transactionData = new FormData()
      transactionData.append("description", `Payment received for Invoice ${payingInvoice.invoiceNumber}`)
      transactionData.append("amount", payingInvoice.total)
      transactionData.append("type", "income")
      transactionData.append("status", "completed")
      transactionData.append("transactionDate", format(new Date(), "yyyy-MM-dd"))
      transactionData.append("toAccountId", selectedAccount) // Fixed: was "toAccount"
      transactionData.append("contactId", payingInvoice.customerId) // Fixed: was "contact"
      transactionData.append("reference", payingInvoice.invoiceNumber)

      const transactionResult = await createTransaction(transactionData)
      if (!transactionResult.success) {
        console.warn("Failed to create transaction record:", transactionResult.error)
      }

      toast.success("Payment Recorded", {
        description: `Invoice ${payingInvoice.invoiceNumber} has been marked as paid and transaction recorded.`,
      })

      setIsPaymentDialogOpen(false)
      setPayingInvoice(null)
      setSelectedAccount("")
      loadInvoices()
    } catch (error) {
      console.error("Error processing payment:", error)
      toast.error("Failed to process payment")
    }
  }

const handleExportPDF = async (invoice: DisplayInvoice) => {
  const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success("Invoice exported", {
    description: `Invoice ${invoice.invoiceNumber} has been downloaded.`,
  });
};

  const calculateSummary = () => {
    const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + Number.parseFloat(invoice.total || "0"), 0)
    const paidAmount = filteredInvoices
      .filter((i) => i.status === "paid")
      .reduce((sum, invoice) => sum + Number.parseFloat(invoice.total || "0"), 0)
    const pendingAmount = filteredInvoices
      .filter((i) => i.status === "sent")
      .reduce((sum, invoice) => sum + Number.parseFloat(invoice.total || "0"), 0)
    const overdueAmount = filteredInvoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, invoice) => sum + Number.parseFloat(invoice.total || "0"), 0)

    return { totalAmount, paidAmount, pendingAmount, overdueAmount }
  }

  const summary = calculateSummary()

  const resetCustomerForm = () => {
    setCustomerFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
    })
    setIsCustomerDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Create, manage, and track your business invoices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingInvoice(null)
                resetForm()
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
                <DialogDescription>
                  {editingInvoice ? "Update the invoice details below." : "Create a new invoice for your customer."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.contactId}
                        onValueChange={(value) => {
                          const customer = customers.find((c) => c.id === value)
                          setFormData({
                            ...formData,
                            contactId: value,
                            customerName: customer?.name || "",
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomerDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: InvoiceStatus) => {
                        setFormData({ ...formData, status: value })
                        if (value === "paid") {
                          setSelectedAccount("")
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INVOICE_STATUS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.status === "paid" && (
                  <div>
                    <Label htmlFor="paymentAccount">Payment Account</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account to receive payment" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-4">
                  {formData.lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          placeholder="Service or product description"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Rate</Label>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, "rate", Number.parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <Input value={`K${item.amount.toFixed(2)}`} disabled />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          disabled={formData.lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Separator />
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>K{calculateTotals().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>Tax Rate:</span>
                      <Input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) => {
                          const newTaxRate = Number.parseFloat(e.target.value) || 0
                          const { subtotal } = calculateTotals()
                          const taxAmount = (subtotal * newTaxRate) / 100
                          const total = subtotal + taxAmount
                          setFormData({
                            ...formData,
                            taxRate: newTaxRate,
                            taxAmount,
                            total,
                          })
                        }}
                        className="w-20"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <span>%</span>
                    </div>
                    <span>K{calculateTotals().taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>K{calculateTotals().total.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>

                <div>
                  <Label htmlFor="terms">Terms</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="Payment terms and conditions..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingInvoice ? "Update Invoice" : "Create Invoice"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">K{summary.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{filteredInvoices.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">K{summary.paidAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.filter((i) => i.status === "paid").length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">K{summary.pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.filter((i) => i.status === "sent").length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">K{summary.overdueAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.filter((i) => i.status === "overdue").length} invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>View and manage all your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.entries(INVOICE_STATUS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const status = invoice.status || "draft"
                const StatusIcon = INVOICE_STATUS[status].icon
                const isOverdue = invoice.status === "sent" && new Date(invoice.dueDate) < new Date()
                const displayStatus = isOverdue ? "overdue" : status

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName || "Unknown Customer"}</TableCell>
                    <TableCell>{format(new Date(invoice.issueDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right font-mono">
                      K{Number.parseFloat(invoice.total || "0").toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleExportPDF(invoice)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(invoice)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Select
                          value={invoice.status || "draft"}
                          onValueChange={(value: "draft" | "sent" | "paid" | "overdue") =>
                            handleStatusChange(invoice.id, value)
                          }
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(INVOICE_STATUS)
                              .filter(([key]) => key !== "cancelled")
                              .map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {viewingInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice {viewingInvoice.invoiceNumber}</DialogTitle>
                <DialogDescription>Invoice details and line items</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Bill To:</h3>
                    <p>{viewingInvoice.customerName || "Unknown Customer"}</p>
                    <p className="text-sm text-muted-foreground">{viewingInvoice.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p>
                      <strong>Issue Date:</strong> {format(new Date(viewingInvoice.issueDate), "MMM dd, yyyy")}
                    </p>
                    <p>
                      <strong>Due Date:</strong> {format(new Date(viewingInvoice.dueDate), "MMM dd, yyyy")}
                    </p>
                    <div className="mt-2">
                      <Badge className={INVOICE_STATUS[viewingInvoice.status || "draft"].color}>
                        {INVOICE_STATUS[viewingInvoice.status || "draft"].label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Separator />
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>K{Number.parseFloat(viewingInvoice.subtotal || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Tax ({Number.parseFloat(viewingInvoice.taxRate || "0").toFixed(1)}
                      %):
                    </span>
                    <span>K{Number.parseFloat(viewingInvoice.taxAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>K{Number.parseFloat(viewingInvoice.total || "0").toFixed(2)}</span>
                  </div>
                </div>

                {viewingInvoice.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">{viewingInvoice.notes}</p>
                  </div>
                )}

                {viewingInvoice.terms && (
                  <div>
                    <h3 className="font-semibold mb-2">Terms</h3>
                    <p className="text-sm text-muted-foreground">{viewingInvoice.terms}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => handleExportPDF(viewingInvoice)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Select the account where payment for Invoice {payingInvoice?.invoiceNumber} will be deposited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Invoice Amount</Label>
              <div className="text-2xl font-bold text-green-600">
                K{payingInvoice ? Number.parseFloat(payingInvoice.total || "0").toLocaleString() : "0"}
              </div>
            </div>
            <div>
              <Label htmlFor="account">Deposit to Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account to receive payment" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={!selectedAccount}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
              <DialogDescription>Add a new customer to your contacts.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="customerName">Name *</Label>
                <Input
                  id="customerName"
                  value={customerFormData.name}
                  onChange={(e) =>
                    setCustomerFormData({
                      ...customerFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Customer name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerFormData.email}
                  onChange={(e) =>
                    setCustomerFormData({
                      ...customerFormData,
                      email: e.target.value,
                    })
                  }
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerFormData.phone}
                  onChange={(e) =>
                    setCustomerFormData({
                      ...customerFormData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">Address</Label>
                <Input
                  id="customerAddress"
                  value={customerFormData.address}
                  onChange={(e) =>
                    setCustomerFormData({
                      ...customerFormData,
                      address: e.target.value,
                    })
                  }
                  placeholder="Customer address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={false}>
                {" "}
                {/* Removed loading state */}
                Create Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
