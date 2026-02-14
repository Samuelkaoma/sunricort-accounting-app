"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  CalendarIcon,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { createContact } from "@/lib/actions/contacts";

// Transaction types and categories
const TRANSACTION_TYPES = {
  income: {
    label: "Income",
    icon: TrendingUp,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  expense: {
    label: "Expense",
    icon: TrendingDown,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  transfer: {
    label: "Transfer",
    icon: ArrowRightLeft,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
};

const TRANSACTION_CATEGORIES = {
  income: ["Sales", "Services", "Interest", "Dividends", "Other Income"],
  expense: [
    "Office Supplies",
    "Rent",
    "Utilities",
    "Marketing",
    "Travel",
    "Meals",
    "Professional Services",
    "Insurance",
    "Other Expense",
  ],
  transfer: ["Bank Transfer", "Account Transfer", "Investment Transfer"],
};

const TRANSACTION_STATUS = {
  pending: {
    label: "Pending",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Contact {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id?: string;
  description: string;
  amount: string;
  type: keyof typeof TRANSACTION_TYPES;
  status: keyof typeof TRANSACTION_STATUS;
  reference?: string | null;
  notes?: string | null;
  transactionDate: Date | string;
  createdAt?: Date | null;
  fromAccount?: Account | null;
  toAccount?: Account | null;
  contact?: Contact | null;
}

interface TransactionManagementProps {
  initialTransactions: Transaction[];
  initialAccounts: Account[];
  initialContacts: Contact[];
}

export function TransactionManagement({
  initialTransactions,
  initialAccounts,
  initialContacts,
}: TransactionManagementProps) {
  const router = useRouter();
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>(
    []
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "vendor" as "customer" | "vendor",
  });

  const [formData, setFormData] = useState<Transaction>({
    transactionDate: format(new Date(), "yyyy-MM-dd"),
    type: "expense",
    description: "",
    amount: "",
    status: "pending",
    reference: "",
    notes: "",
    fromAccount: null,
    toAccount: null,
    contact: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataObj.append(key, value.toString());
        }
      });

      let result;
      if (editingTransaction?.id) {
        result = await updateTransaction(editingTransaction.id, formDataObj);
      } else {
        result = await createTransaction(formDataObj);
      }

      if (result.success) {
        toast(
          editingTransaction ? "Transaction Updated " : "Transaction Created",
          {
            description: `The transaction has been ${
              editingTransaction ? "updated" : "created"
            } successfully.`,
          }
        );

        router.refresh();
        resetForm();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error("Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      type: "expense",
      description: "",
      amount: "",
      status: "pending",
      reference: "",
      notes: "",
      fromAccount: null,
      toAccount: null,
      contact: null,
    });
    setEditingTransaction(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      transactionDate: format(
        new Date(transaction.transactionDate),
        "yyyy-MM-dd"
      ),
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      status: transaction.status,
      reference: transaction.reference || "",
      notes: transaction.notes || "",
      fromAccount: transaction.fromAccount || null,
      toAccount: transaction.toAccount || null,
      contact: transaction.contact || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (transactionId: string) => {
    setLoading(true);
    try {
      const result = await deleteTransaction(transactionId);

      if (result.success) {
        toast("Transaction Deleted", {
          description: "The transaction has been deleted successfully.",
        });

        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      await Promise.all(
        selectedTransactions.map((id) => deleteTransaction(id))
      );

      toast("Transactions Deleted", {
        description: `${selectedTransactions.length} transactions have been deleted.`,
      });

      setSelectedTransactions([]);

      router.refresh();
    } catch (error) {
      console.error("Error deleting transactions:", error);
      toast.error("Failed to delete transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(transactions.map((t) => t.id!).filter(Boolean));
    } else {
      setSelectedTransactions([]);
    }
  };

  const calculateTotals = () => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);

    return { income, expenses, net: income - expenses };
  };

  const totals = calculateTotals();

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append("name", contactFormData.name);
      formDataObj.append("email", contactFormData.email);
      formDataObj.append("phone", contactFormData.phone);
      formDataObj.append("type", contactFormData.type);

      const result = await createContact(formDataObj);

      if (result.success) {
        toast("Contact Created", {
          description: `${contactFormData.type} "${contactFormData.name}" has been created successfully.`,
        });

        router.refresh();

        // Set the newly created contact as selected
        if (result.data) {
          setFormData({ ...formData, contact: result.data });
        }

        resetContactForm();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error creating contact:", error);
      toast.error("Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  const resetContactForm = () => {
    setContactFormData({
      name: "",
      email: "",
      phone: "",
      type: "vendor",
    });
    setIsContactDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">
            Track and manage all your business transactions
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button> */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingTransaction(null);
                  resetForm();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingTransaction
                      ? "Edit Transaction"
                      : "Create New Transaction"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTransaction
                      ? "Update the transaction details below."
                      : "Add a new transaction to your records."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="transactionDate">Date</Label>
                      <Input
                        id="transactionDate"
                        name="transactionDate"
                        type="date"
                        value={
                          typeof formData.transactionDate === "string"
                            ? formData.transactionDate
                            : format(
                                new Date(formData.transactionDate),
                                "yyyy-MM-dd"
                              )
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transactionDate: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        name="type"
                        value={formData.type}
                        onValueChange={(
                          value: keyof typeof TRANSACTION_TYPES
                        ) => {
                          setFormData({
                            ...formData,
                            type: value,
                            fromAccount: null,
                            toAccount: null,
                            contact: null,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRANSACTION_TYPES).map(
                            ([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        name="status"
                        value={formData.status}
                        onValueChange={(
                          value: keyof typeof TRANSACTION_STATUS
                        ) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRANSACTION_STATUS).map(
                            ([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.type === "transfer" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fromAccount">From Account</Label>
                        <Select
                          name="fromAccount"
                          value={formData.fromAccount?.id || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              fromAccount: accounts.find((a) => a.id === value),
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select from account" />
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
                      <div>
                        <Label htmlFor="toAccount">To Account</Label>
                        <Select
                          name="toAccount"
                          value={formData.toAccount?.id || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              toAccount: accounts.find((a) => a.id === value),
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select to account" />
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
                  )}

                  {formData.type === "expense" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fromAccount">From Account</Label>
                        <Select
                          name="fromAccount"
                          value={formData.fromAccount?.id || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              fromAccount: accounts.find((a) => a.id === value),
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
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
                      <div>
                        <Label htmlFor="contact">Vendor</Label>
                        <div className="flex gap-2">
                          <Select
                            name="contact"
                            value={formData.contact?.id || ""}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                contact: contacts.find((c) => c.id === value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {contacts
                                .filter((c) => c.type === "vendor")
                                .map((contact) => (
                                  <SelectItem
                                    key={contact.id}
                                    value={contact.id}
                                  >
                                    {contact.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setContactFormData({
                                ...contactFormData,
                                type: "vendor",
                              });
                              setIsContactDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.type === "income" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="toAccount">To Account</Label>
                        <Select
                          name="toAccount"
                          value={formData.toAccount?.id || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              toAccount: accounts.find((a) => a.id === value),
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
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
                      <div>
                        <Label htmlFor="contact">Customer</Label>
                        <div className="flex gap-2">
                          <Select
                            name="contact"
                            value={formData.contact?.id || ""}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                contact: contacts.find((c) => c.id === value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {contacts
                                .filter((c) => c.type === "customer")
                                .map((contact) => (
                                  <SelectItem
                                    key={contact.id}
                                    value={contact.id}
                                  >
                                    {contact.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setContactFormData({
                                ...contactFormData,
                                type: "customer",
                              });
                              setIsContactDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      name="reference"
                      value={formData.reference || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, reference: e.target.value })
                      }
                      placeholder="REF-001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Transaction description..."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {editingTransaction
                      ? "Update Transaction"
                      : "Create Transaction"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              K{totals.income.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => t.type === "income").length}{" "}
              transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              K{totals.expenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => t.type === "expense").length}{" "}
              transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totals.net >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              K{totals.net.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.length} total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            View and manage all your business transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(TRANSACTION_STATUS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px] bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedTransactions.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-md">
              <span className="text-sm">
                {selectedTransactions.length} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedTransactions.length === transactions.length &&
                      transactions.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const TypeIcon = TRANSACTION_TYPES[transaction.type].icon;
                const fromAccountName = transaction.fromAccount?.name;
                const toAccountName = transaction.toAccount?.name;
                const contactName = transaction.contact?.name;

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.id!)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTransactions([
                              ...selectedTransactions,
                              transaction.id!,
                            ]);
                          } else {
                            setSelectedTransactions(
                              selectedTransactions.filter(
                                (id) => id !== transaction.id
                              )
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(transaction.transactionDate),
                        "MMM dd, yyyy"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <Badge
                          className={TRANSACTION_TYPES[transaction.type].color}
                        >
                          {TRANSACTION_TYPES[transaction.type].label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.type === "transfer" && fromAccountName ? (
                        <span>{fromAccountName}</span>
                      ) : transaction.type === "expense" &&
                        (fromAccountName || contactName) ? (
                        <span>{fromAccountName || contactName || "-"}</span>
                      ) : transaction.type === "income" && contactName ? (
                        <span>{contactName}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.type === "transfer" && toAccountName ? (
                        <span>{toAccountName}</span>
                      ) : transaction.type === "expense" && contactName ? (
                        <span>{contactName}</span>
                      ) : transaction.type === "income" && toAccountName ? (
                        <span>{toAccountName}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      K{Number.parseFloat(transaction.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={TRANSACTION_STATUS[transaction.status].color}
                      >
                        {TRANSACTION_STATUS[transaction.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.reference || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id!)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {transactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateContact}>
            <DialogHeader>
              <DialogTitle>
                Create New{" "}
                {contactFormData.type === "customer" ? "Customer" : "Vendor"}
              </DialogTitle>
              <DialogDescription>
                Add a new {contactFormData.type} to your contacts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="contactName">Name *</Label>
                <Input
                  id="contactName"
                  value={contactFormData.name}
                  onChange={(e) =>
                    setContactFormData({
                      ...contactFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Contact name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) =>
                    setContactFormData({
                      ...contactFormData,
                      email: e.target.value,
                    })
                  }
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={contactFormData.phone}
                  onChange={(e) =>
                    setContactFormData({
                      ...contactFormData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetContactForm}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Create{" "}
                {contactFormData.type === "customer" ? "Customer" : "Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
