"use client";

import type React from "react";
import { useState, useMemo } from "react";
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
  CalendarIcon,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  getVendors,
} from "@/lib/actions/expenses";
import { createTransaction } from "@/lib/actions/transactions";
import { createContact } from "@/lib/actions/contacts";

type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed";

const EXPENSE_STATUS: Record<
  ExpenseStatus,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    icon: FileText,
  },
  submitted: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: XCircle,
  },
  reimbursed: {
    label: "Reimbursed",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    icon: DollarSign,
  },
};

interface Expense {
  id: string;
  amount: string;
  status: ExpenseStatus;
  createdAt: Date;
  updatedAt: Date;
  vendor: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
}

interface ExpenseManagementProps {
  initialExpenses: Expense[];
  initialVendors: Vendor[];
  initialAccounts: Account[];
}

export function ExpenseManagement({
  initialExpenses,
  initialVendors,
  initialAccounts,
}: ExpenseManagementProps) {
  const router = useRouter();

  const [expenses] = useState<Expense[]>(initialExpenses);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [accounts] = useState<Account[]>(initialAccounts);

  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    status: "draft" as ExpenseStatus,
    vendorId: "",
    accountId: "",
  });

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [payingExpense, setPayingExpense] = useState<Expense | null>(null);
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState("");
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);

  const [vendorFormData, setVendorFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        expense.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.account?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        selectedStatus === "ALL" || expense.status === selectedStatus;
      const matchesDateRange =
        (!dateRange.from || new Date(expense.createdAt) >= dateRange.from) &&
        (!dateRange.to || new Date(expense.createdAt) <= dateRange.to);
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [expenses, searchTerm, selectedStatus, dateRange]);

  const summary = useMemo(() => {
    return {
      totalAmount: filteredExpenses.reduce(
        (sum, e) => sum + Number.parseFloat(e.amount),
        0
      ),
      pendingAmount: filteredExpenses
        .filter((e) => e.status === "submitted")
        .reduce((sum, e) => sum + Number.parseFloat(e.amount), 0),
      approvedAmount: filteredExpenses
        .filter((e) => e.status === "approved")
        .reduce((sum, e) => sum + Number.parseFloat(e.amount), 0),
      reimbursedAmount: filteredExpenses
        .filter((e) => e.status === "reimbursed")
        .reduce((sum, e) => sum + Number.parseFloat(e.amount), 0),
    };
  }, [filteredExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append("amount", formData.amount);
      formDataObj.append("status", formData.status);
      formDataObj.append("vendorId", formData.vendorId);
      formDataObj.append("accountId", formData.accountId);

      let result;
      if (editingExpense) {
        result = await updateExpense(editingExpense.id, formDataObj);
      } else {
        result = await createExpense(formDataObj);
      }

      if (result.success) {
        toast(editingExpense ? "Expense Updated" : "Expense Created", {
          description: `The expense has been ${
            editingExpense ? "updated" : "created"
          } successfully.`,
        });
        router.refresh();
        resetForm();
      } else {
        toast.error(result.error || "Failed to save expense");
      }
    } catch (error) {
      console.log(error);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    try {
      const result = await deleteExpense(expenseId);
      if (result.success) {
        toast("Expense Deleted", {
          description: "The expense has been deleted successfully.",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete expense");
      }
    } catch (error) {
      console.log(error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleStatusChange = async (
    expenseId: string,
    newStatus: ExpenseStatus
  ) => {
    if (newStatus === "approved") {
      const expense = expenses.find((e) => e.id === expenseId);
      if (expense) {
        setPayingExpense(expense);
        setIsPaymentDialogOpen(true);
        return;
      }
    }

    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      const formDataObj = new FormData();
      formDataObj.append("amount", expense.amount);
      formDataObj.append("status", newStatus);
      formDataObj.append("vendorId", expense.vendor?.id || "");
      formDataObj.append("accountId", expense.account?.id || "");

      const result = await updateExpense(expenseId, formDataObj);
      if (result.success) {
        toast("Status Updated", {
          description: `Expense status has been updated to ${EXPENSE_STATUS[newStatus].label}.`,
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handlePayment = async () => {
    if (!payingExpense || !selectedPaymentAccount) {
      toast.error("Please select an account for payment");
      return;
    }

    try {
      const formDataObj = new FormData();
      formDataObj.append("amount", payingExpense.amount);
      formDataObj.append("status", "approved");
      formDataObj.append("vendorId", payingExpense.vendor?.id || "");
      formDataObj.append("accountId", payingExpense.account?.id || "");

      const statusResult = await updateExpense(payingExpense.id, formDataObj);
      if (!statusResult.success) {
        throw new Error(
          statusResult.error || "Failed to update expense status"
        );
      }

      const transactionData = new FormData();
      transactionData.append(
        "description",
        `Expense payment to ${payingExpense.vendor?.name || "Vendor"}`
      );
      transactionData.append("amount", payingExpense.amount);
      transactionData.append("type", "expense");
      transactionData.append("status", "completed");
      transactionData.append(
        "transactionDate",
        format(new Date(), "yyyy-MM-dd")
      );
      transactionData.append("fromAccount", selectedPaymentAccount);
      transactionData.append("contact", payingExpense.vendor?.id || "");
      transactionData.append("reference", `EXP-${payingExpense.id}`);

      const transactionResult = await createTransaction(transactionData);
      if (!transactionResult.success) {
        console.warn(
          "Failed to create transaction record:",
          transactionResult.error
        );
      }

      toast("Expense Approved", {
        description: `Expense has been approved and payment transaction recorded.`,
      });

      setIsPaymentDialogOpen(false);
      setPayingExpense(null);
      setSelectedPaymentAccount("");
      router.refresh();
    } catch (error) {
      console.error("Error processing expense payment:", error);
      toast.error("Failed to process expense payment");
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === "delete") {
      try {
        await Promise.all(selectedExpenses.map((id) => deleteExpense(id)));
        setSelectedExpenses([]);
        toast("Expenses Deleted", {
          description: `${selectedExpenses.length} expenses have been deleted.`,
        });
        router.refresh();
      } catch (error) {
        toast.error("Failed to delete expenses");
      }
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formDataObj = new FormData();
      formDataObj.append("name", vendorFormData.name);
      formDataObj.append("email", vendorFormData.email);
      formDataObj.append("phone", vendorFormData.phone);
      formDataObj.append("type", "vendor");

      const result = await createContact(formDataObj);

      if (result.success) {
        toast("Vendor Created", {
          description: `Vendor "${vendorFormData.name}" has been created successfully.`,
        });

        const vendorsResult = await getVendors();
        if (vendorsResult.success && vendorsResult.data) {
          setVendors(vendorsResult.data);
        }

        if (result.data) {
          setFormData({ ...formData, vendorId: result.data.id });
        }

        setIsVendorDialogOpen(false);
        resetVendorForm();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error creating vendor:", error);
      toast.error("Failed to create vendor");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(filteredExpenses.map((e) => e.id));
    } else {
      setSelectedExpenses([]);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount,
      status: expense.status,
      vendorId: expense.vendor?.id || "",
      accountId: expense.account?.id || "",
    });
    setIsDialogOpen(true);
  };

  const handleView = (expense: Expense) => {
    setViewingExpense(expense);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      status: "draft" as ExpenseStatus,
      vendorId: "",
      accountId: "",
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const resetVendorForm = () => {
    setVendorFormData({
      name: "",
      email: "",
      phone: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage business expenses and reimbursements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingExpense(null);
                  resetForm();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? "Edit Expense" : "Create New Expense"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingExpense
                      ? "Update the expense details below."
                      : "Add a new expense to your records."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
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
                        value={formData.status}
                        onValueChange={(value: ExpenseStatus) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EXPENSE_STATUS).map(
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
                      <Label htmlFor="vendor">Vendor</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.vendorId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, vendorId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsVendorDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="account">Account</Label>
                      <Select
                        value={formData.accountId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, accountId: value })
                        }
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
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingExpense ? "Update Expense" : "Create Expense"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              K{summary.totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              K{summary.pendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.filter((e) => e.status === "submitted").length}{" "}
              expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              K{summary.approvedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.filter((e) => e.status === "approved").length}{" "}
              expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reimbursed</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              K{summary.reimbursedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.filter((e) => e.status === "reimbursed").length}{" "}
              expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>
            View and manage all your business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
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
                {Object.entries(EXPENSE_STATUS).map(([key, value]) => (
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

          {selectedExpenses.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-md">
              <span className="text-sm">
                {selectedExpenses.length} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction("delete")}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          )}

          {/* Expenses Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedExpenses.length === filteredExpenses.length &&
                      filteredExpenses.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const StatusIcon = EXPENSE_STATUS[expense.status].icon;
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedExpenses.includes(expense.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExpenses([
                              ...selectedExpenses,
                              expense.id,
                            ]);
                          } else {
                            setSelectedExpenses(
                              selectedExpenses.filter((id) => id !== expense.id)
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{expense.vendor?.name || "N/A"}</TableCell>
                    <TableCell>{expense.account?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={EXPENSE_STATUS[expense.status].color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {EXPENSE_STATUS[expense.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      K{Number.parseFloat(expense.amount).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Select
                          value={expense.status}
                          onValueChange={(value: ExpenseStatus) =>
                            handleStatusChange(expense.id, value)
                          }
                        >
                          <SelectTrigger className="w-[150px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EXPENSE_STATUS).map(
                              ([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
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
        </CardContent>
      </Card>

      {/* Expense View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {viewingExpense && (
            <>
              <DialogHeader>
                <DialogTitle>Expense Details</DialogTitle>
                <DialogDescription>View expense information</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <p>
                      {format(
                        new Date(viewingExpense.createdAt),
                        "MMM dd, yyyy"
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <p className="font-mono">
                      K
                      {Number.parseFloat(
                        viewingExpense.amount
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Vendor</Label>
                    <p>{viewingExpense.vendor?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Account</Label>
                    <p>{viewingExpense.account?.name || "N/A"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge
                    className={EXPENSE_STATUS[viewingExpense.status]?.color}
                  >
                    {EXPENSE_STATUS[viewingExpense.status]?.label}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Approve Expense</DialogTitle>
            <DialogDescription>
              Select the account from which this expense will be paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Expense Amount</Label>
              <div className="text-2xl font-bold text-red-600">
                K
                {payingExpense
                  ? Number.parseFloat(
                      payingExpense.amount || "0"
                    ).toLocaleString()
                  : "0"}
              </div>
            </div>
            <div>
              <Label>Vendor</Label>
              <p className="text-sm text-muted-foreground">
                {payingExpense?.vendor?.name || "N/A"}
              </p>
            </div>
            <div>
              <Label htmlFor="paymentAccount">Payment Account</Label>
              <Select
                value={selectedPaymentAccount}
                onValueChange={setSelectedPaymentAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment account" />
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
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={!selectedPaymentAccount}>
              Approve & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Creation Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateVendor}>
            <DialogHeader>
              <DialogTitle>Create New Vendor</DialogTitle>
              <DialogDescription>
                Add a new vendor to your contacts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="vendorName">Name *</Label>
                <Input
                  id="vendorName"
                  value={vendorFormData.name}
                  onChange={(e) =>
                    setVendorFormData({
                      ...vendorFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Vendor name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="vendorEmail">Email</Label>
                <Input
                  id="vendorEmail"
                  type="email"
                  value={vendorFormData.email}
                  onChange={(e) =>
                    setVendorFormData({
                      ...vendorFormData,
                      email: e.target.value,
                    })
                  }
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <Label htmlFor="vendorPhone">Phone</Label>
                <Input
                  id="vendorPhone"
                  value={vendorFormData.phone}
                  onChange={(e) =>
                    setVendorFormData({
                      ...vendorFormData,
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
                onClick={() => {
                  setIsVendorDialogOpen(false);
                  resetVendorForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                Create Vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
