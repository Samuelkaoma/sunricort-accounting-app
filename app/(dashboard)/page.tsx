import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  CreditCard,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getDashboardData } from "@/lib/actions/dashboard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const dashboardResult = await getDashboardData();

  if (!dashboardResult.success) {
    return (
      <div className="space-y-6">
        <div className="text-center text-red-600">
          Error loading dashboard data: {dashboardResult.error}
        </div>
      </div>
    );
  }

  const data = dashboardResult.data;

  const metrics = [
    {
      title: "Total Balance",
      value: `K${data?.totalBalance.toLocaleString()}`,
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Monthly Expenses",
      value: `K${data?.monthlyExpenses.toLocaleString()}`,
      change: "+8.2%",
      trend: "up",
      icon: TrendingDown,
      color: "text-red-600",
    },
    {
      title: "Net Income",
      value: `K${data?.netIncome.toLocaleString()}`,
      change: "+18.7%",
      trend: data?.netIncome ? (data?.netIncome >= 0 ? "up" : "down") : "down",
      icon: TrendingUp,
      color: data?.netIncome
        ? data?.netIncome >= 0
          ? "text-green-600"
          : "text-red-600"
        : "text-red-600",
    },
    {
      title: "Outstanding Amount",
      value: `K${data?.outstandingAmount.toLocaleString()}`,
      change: "-5.3%",
      trend: "down",
      icon: FileText,
      color: "text-orange-600",
    },
  ];

  const formattedTransactions = data?.recentTransactions.map(
    (transaction: any) => ({
      id: transaction.id,
      description: transaction.description,
      account:
        transaction.fromAccount || transaction.toAccount || "Unknown Account",
      amount: Number.parseFloat(transaction.amount),
      date: transaction.transactionDate,
      type: transaction.type,
    })
  );

  const quickActions = [
    {
      title: "Create Invoice",
      description: "Generate a new invoice",
      icon: FileText,
      color: "bg-blue-500",
      href: "/invoices",
    },
    {
      title: "Add Expense",
      description: "Record a new expense",
      icon: Receipt,
      color: "bg-red-500",
      href: "/expenses",
    },
    {
      title: "Record Payment",
      description: "Log a payment received",
      icon: CreditCard,
      color: "bg-green-500",
      href: "/transactions",
    },
    {
      title: "Upload Receipt",
      description: "Upload receipt document",
      icon: Upload,
      color: "bg-purple-500",
      href: "/expenses",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session.user.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metric.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span
                  className={
                    metric.trend === "up" ? "text-green-600" : "text-red-600"
                  }
                >
                  {metric.change}
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {formattedTransactions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent transactions found</p>
                <p className="text-sm">
                  Start by creating an invoice or recording an expense
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedTransactions?.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {transaction.account}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(transaction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}K
                        {Math.abs(transaction.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-transparent"
                >
                  <div className={`p-2 rounded-lg ${action.color} mr-3`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs text-gray-500">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Cash flow overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balances by Type</CardTitle>
          <CardDescription>
            Current balances across different account types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data?.accountsByType ?? {}).map(
              ([type, balance]) => (
                <div key={type} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium capitalize">
                    {type}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">
                        Balance: {`K${(balance as number).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={Math.min(
                          ((balance as number) /
                            Math.max(data?.totalBalance ?? 1, 1)) *
                            100,
                          100
                        )}
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-blue-600">
                    K{(balance as number).toLocaleString()}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
