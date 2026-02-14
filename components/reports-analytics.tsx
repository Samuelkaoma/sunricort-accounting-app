"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, DollarSign, Download, RefreshCw } from "lucide-react"

const DATE_RANGES = [
  { value: "current-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "current-year", label: "This Year" },
]

const formatKwacha = (amount: number) => {
  return `K${amount.toLocaleString()}`
}

interface ReportsAnalyticsProps {
  initialKpiData: any
  initialProfitLossData: any
  initialExpenseAnalysisData: any
  initialRevenueAnalysisData: any
  initialDateRange: string
}

export function ReportsAnalytics({
  initialKpiData,
  initialProfitLossData,
  initialExpenseAnalysisData,
  initialRevenueAnalysisData,
  initialDateRange,
}: ReportsAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState(initialDateRange)
  const [loading, setLoading] = useState(false)

  const kpiData = initialKpiData
  const profitLossData = initialProfitLossData
  const expenseAnalysisData = initialExpenseAnalysisData
  const revenueAnalysisData = initialRevenueAnalysisData

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    setLoading(true)
    // Trigger a page refresh which will fetch new data on the server
    router.refresh()
    setTimeout(() => setLoading(false), 500)
  }

  const handleRefresh = () => {
    setLoading(true)
    router.refresh()
    setTimeout(() => setLoading(false), 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Simple business overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 max-w-xs">
              <Label>Period</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {kpiData ? formatKwacha(kpiData.revenue || 0) : formatKwacha(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {kpiData ? formatKwacha(kpiData.expenses || 0) : formatKwacha(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {kpiData ? formatKwacha((kpiData.revenue || 0) - (kpiData.expenses || 0)) : formatKwacha(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {kpiData ? formatKwacha(kpiData.assets || 0) : formatKwacha(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary</CardTitle>
          <CardDescription>Monthly revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueAnalysisData?.byCustomer && revenueAnalysisData.byCustomer.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueAnalysisData.byCustomer.slice(0, 10).map((customer: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{customer.customerName}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatKwacha(Number(customer.amount) || 0)}
                    </TableCell>
                    <TableCell className="text-right">{customer.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No revenue data available for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Summary</CardTitle>
          <CardDescription>Top expenses by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseAnalysisData?.byVendor && expenseAnalysisData.byVendor.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseAnalysisData.byVendor.slice(0, 10).map((vendor: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{vendor.vendorName}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatKwacha(Number(vendor.amount) || 0)}
                    </TableCell>
                    <TableCell className="text-right">{vendor.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No expense data available for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      {profitLossData && (profitLossData.revenue?.length > 0 || profitLossData.expenses?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Profit & Loss</CardTitle>
            <CardDescription>Revenue vs expenses by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">Monthly Revenue</h4>
                <div className="space-y-2">
                  {profitLossData.revenue?.slice(0, 6).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {new Date(item.month).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-mono text-green-600">{formatKwacha(Number(item.revenue) || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-red-600 mb-2">Monthly Expenses</h4>
                <div className="space-y-2">
                  {profitLossData.expenses?.slice(0, 6).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {new Date(item.month).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-mono text-red-600">{formatKwacha(Number(item.expenses) || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
