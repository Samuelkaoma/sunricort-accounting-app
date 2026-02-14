"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, TrendingUp, TrendingDown, Users, FileText, Receipt, Plus } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Mock data - will be replaced with real data later
interface DashboardOverviewProps {
  data: {
    success: boolean
    data?: {
      totalBalance: number
      monthlyIncome: number
      monthlyExpenses: number
      netIncome: number
      totalInvoiced: number
      totalPaid: number
      outstandingAmount: number
      pendingExpenses: number
      recentTransactions: any[]
      accountsData: any[]
      accountsByType: {
        Cash: number
        Bank: number
        Mobile: number
        Credit: number
      }
    }
    error?: string
  }
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  if (!data.success || !data.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{data.error || "Failed to load dashboard data"}</p>
        </div>
      </div>
    )
  }

  const {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    netIncome,
    totalInvoiced,
    totalPaid,
    outstandingAmount,
    pendingExpenses,
    recentTransactions,
    accountsByType,
  } = data.data

  const chartData = [
    { name: "Cash", amount: accountsByType.Cash },
    { name: "Bank", amount: accountsByType.Bank },
    { name: "Mobile", amount: accountsByType.Mobile },
    { name: "Credit", amount: Math.abs(accountsByType.Credit) },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">K{totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">K{monthlyIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">K{monthlyExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              K{netIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Balances Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
            <CardDescription>Current balances by account type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                            : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <Receipt className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}K{Number.parseFloat(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent transactions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to help you manage your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <FileText className="h-6 w-6 mb-2" />
              Create Invoice
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Receipt className="h-6 w-6 mb-2" />
              Add Expense
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Users className="h-6 w-6 mb-2" />
              Add Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
