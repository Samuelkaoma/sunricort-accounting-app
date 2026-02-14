"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Edit, Trash2, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransactionStatus,
} from "@/lib/actions/recurring";

interface RecurringTransaction {
  id: string;
  name: string;
  description: string;
  amount: string;
  type: "income" | "expense" | "transfer";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  startDate: Date;
  endDate: Date | null;
  nextDate: Date;
  isActive: boolean | null;
  fromAccount?: { id: string; name: string; type: string } | null;
  toAccount?: { id: string; name: string; type: string } | null;
  contact?: { id: string; name: string; type: string } | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
}
interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

interface RecurringTransactionManagementProps {
  initialRecurringTransactions: RecurringTransaction[];
  initialAccounts: Account[];
  initialCustomers: Customer[];
  initialVendors: Vendor[];
}

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const typeOptions = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

export function RecurringTransactionManagement({
  initialRecurringTransactions,
  initialAccounts,
  initialCustomers,
  initialVendors,
}: RecurringTransactionManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<RecurringTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFrequency, setFilterFrequency] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    type: "expense",
    frequency: "monthly",
    fromAccountId: "",
    toAccountId: "",
    contactId: "",
    startDate: new Date(),
    endDate: undefined as Date | undefined,
  });

  const filteredTransactions = initialRecurringTransactions.filter(
    (transaction) => {
      const matchesSearch =
        transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "all" || transaction.type === filterType;
      const matchesFrequency =
        filterFrequency === "all" || transaction.frequency === filterFrequency;
      return matchesSearch && matchesType && matchesFrequency;
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append("name", formData.name);
      formDataObj.append("description", formData.description);
      formDataObj.append("amount", formData.amount);
      formDataObj.append("type", formData.type);
      formDataObj.append("frequency", formData.frequency);
      formDataObj.append("fromAccountId", formData.fromAccountId);
      formDataObj.append("toAccountId", formData.toAccountId);
      formDataObj.append("contactId", formData.contactId);
      formDataObj.append("startDate", formData.startDate.toISOString());
      if (formData.endDate) {
        formDataObj.append("endDate", formData.endDate.toISOString());
      }

      let result;
      if (editingTransaction) {
        result = await updateRecurringTransaction(
          editingTransaction.id,
          formDataObj
        );
      } else {
        result = await createRecurringTransaction(formDataObj);
      }

      if (result.success) {
        toast.success(
          `Recurring transaction ${
            editingTransaction ? "updated" : "created"
          } successfully`
        );
        setIsDialogOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      amount: "",
      type: "expense",
      frequency: "monthly",
      fromAccountId: "",
      toAccountId: "",
      contactId: "",
      startDate: new Date(),
      endDate: undefined,
    });
    setEditingTransaction(null);
  };

  const toggleTransactionStatus = async (id: string) => {
    try {
      const result = await toggleRecurringTransactionStatus(id);
      if (result.success) {
        toast.success("Transaction status updated successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update transaction status");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this recurring transaction?")
    ) {
      return;
    }

    try {
      const result = await deleteRecurringTransaction(id);
      if (result.success) {
        toast.success("Recurring transaction deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete recurring transaction");
    }
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      name: transaction.name,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      frequency: transaction.frequency,
      fromAccountId: transaction.fromAccount?.id || "",
      toAccountId: transaction.toAccount?.id || "",
      contactId: transaction.contact?.id || "",
      startDate: new Date(transaction.startDate),
      endDate: transaction.endDate ? new Date(transaction.endDate) : undefined,
    });
    setIsDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "bg-green-100 text-green-800";
      case "expense":
        return "bg-red-100 text-red-800";
      case "transfer":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "bg-purple-100 text-purple-800";
      case "weekly":
        return "bg-blue-100 text-blue-800";
      case "monthly":
        return "bg-green-100 text-green-800";
      case "yearly":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const activeTransactions = initialRecurringTransactions.filter(
    (t) => t.isActive
  );
  const monthlyIncome = activeTransactions
    .filter((t) => t.type === "income" && t.frequency === "monthly")
    .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
  const monthlyExpenses = activeTransactions
    .filter((t) => t.type === "expense" && t.frequency === "monthly")
    .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Recurring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTransactions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {initialRecurringTransactions.filter((t) => !t.isActive).length}{" "}
              inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              K{monthlyIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Recurring monthly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              K{monthlyExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Recurring monthly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              K{(monthlyIncome - monthlyExpenses).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Monthly net flow</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <Input
            placeholder="Search recurring transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFrequency} onValueChange={setFilterFrequency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Recurring Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction
                  ? "Edit Recurring Transaction"
                  : "Add Recurring Transaction"}
              </DialogTitle>
              <DialogDescription>
                Create a new recurring transaction that will be automatically
                processed.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromAccount">From Account</Label>
                  <Select
                    value={formData.fromAccountId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, fromAccountId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {initialAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toAccount">To Account</Label>
                  <Select
                    value={formData.toAccountId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, toAccountId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {initialAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={formData.contactId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contactId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {initialCustomers.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} (Customer)
                      </SelectItem>
                    ))}
                    {initialVendors.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} (Vendor)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate
                          ? format(formData.startDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            startDate: date || new Date(),
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate
                          ? format(formData.endDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) =>
                          setFormData({ ...formData, endDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "Saving..."
                    : editingTransaction
                    ? "Update"
                    : "Create"}{" "}
                  Recurring Transaction
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{transaction.name}</h3>
                    <Badge className={getTypeColor(transaction.type)}>
                      {transaction.type}
                    </Badge>
                    <Badge className={getFrequencyColor(transaction.frequency)}>
                      {transaction.frequency}
                    </Badge>
                    {!transaction.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{transaction.description}</p>
                    <p>
                      Amount:{" "}
                      <span className="font-medium">
                        K
                        {Number.parseFloat(transaction.amount).toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Next Date:{" "}
                      <span className="font-medium">
                        {format(new Date(transaction.nextDate), "PPP")}
                      </span>
                    </p>
                    {transaction.fromAccount && (
                      <p>
                        From:{" "}
                        <span className="font-medium">
                          {transaction.fromAccount.name}
                        </span>
                      </p>
                    )}
                    {transaction.toAccount && (
                      <p>
                        To:{" "}
                        <span className="font-medium">
                          {transaction.toAccount.name}
                        </span>
                      </p>
                    )}
                    {transaction.contact && (
                      <p>
                        Contact:{" "}
                        <span className="font-medium">
                          {transaction.contact.name}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTransactionStatus(transaction.id)}
                  >
                    {transaction.isActive ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(transaction)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(transaction.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
