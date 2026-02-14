"use client";

import type React from "react";
import { useState } from "react";
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
import { Plus, Search, Edit, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/actions/accounts";
import { useRouter } from "next/navigation";

const ACCOUNT_TYPES = {
  cash: {
    label: "Cash",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  bank: {
    label: "Bank",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  mobile: {
    label: "Mobile Money",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  credit: {
    label: "Credit",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

interface Account {
  id?: string;
  name: string;
  type: keyof typeof ACCOUNT_TYPES;
  balance: string;
  description: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface AccountsManagementProps {
  initialAccounts: Account[];
  initialSummary: any;
}

export function AccountsManagement({
  initialAccounts,
  initialSummary,
}: AccountsManagementProps) {
  const router = useRouter();
  const [accounts] = useState<Account[]>(initialAccounts);
  const [summary] = useState<any>(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<Account>({
    name: "",
    type: "cash",
    balance: "0",
    description: "",
  });

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "ALL" || account.type === selectedType;
    return matchesSearch && matchesType;
  });

  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
    return groups;
  }, {} as Record<string, typeof accounts>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      console.log("form Data", formData);
      formDataObj.append("name", formData.name);
      formDataObj.append("type", formData.type);
      formDataObj.append("balance", formData.balance);
      formDataObj.append("description", formData.description || "");
      console.log("Form Data Object:", formDataObj.get("balance"));

      let result;
      if (editingAccount) {
        result = await updateAccount(editingAccount.id!, formDataObj);
      } else {
        result = await createAccount(formDataObj);
      }

      if (result.success) {
        toast(editingAccount ? "Account Updated" : "Account Created", {
          description: `${formData.name} has been ${
            editingAccount ? "updated" : "created"
          } successfully.`,
        });
        router.refresh();
        resetForm();
      } else {
        toast.error("Error", {
          description: result.error || "Failed to save account",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "cash",
      balance: "0",
      description: "",
    });
    setEditingAccount(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      description: account.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    try {
      console.log("account ID", accountId);
      const result = await deleteAccount(accountId);
      if (result.success) {
        toast("Account Deleted", {
          description: "The account has been deleted successfully.",
        });
        router.refresh();
      } else {
        toast.error("Error", {
          description: result.error || "Failed to delete account",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your business accounts and track balances
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit Account" : "Create New Account"}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount
                    ? "Update the account details below."
                    : "Add a new account to your chart of accounts."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="Cash Account"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: keyof typeof ACCOUNT_TYPES) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCOUNT_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="balance" className="text-right">
                    Balance
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) =>
                      setFormData({ ...formData, balance: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    className="col-span-3"
                    placeholder="Account description..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : editingAccount
                    ? "Update Account"
                    : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(ACCOUNT_TYPES).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {value.label}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                K{summary?.accountsByType?.[key]?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {accounts.filter((a) => a.type === key).length} accounts
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            View and manage all your business accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.entries(ACCOUNT_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Accounts Table */}
          <div className="space-y-6">
            {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
              <div key={type}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {ACCOUNT_TYPES[type as keyof typeof ACCOUNT_TYPES].label}
                  <Badge
                    className={
                      ACCOUNT_TYPES[type as keyof typeof ACCOUNT_TYPES].color
                    }
                  >
                    {typeAccounts.length}
                  </Badge>
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account.description}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          K{Number.parseFloat(account.balance).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(account)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(account.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
