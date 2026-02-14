import { ReportsAnalytics } from "@/components/reports-analytics";
import {
  getFinancialKPIs,
  getProfitLossReport,
  getExpenseAnalysisReport,
  getRevenueAnalysisReport,
} from "@/lib/actions/reports";

export default async function ReportsPage() {
  // Get current month date range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endDate = now.toISOString().split("T")[0];

  // Fetch all report data in parallel on the server
  const [
    kpisResult,
    profitLossResult,
    expenseAnalysisResult,
    revenueAnalysisResult,
  ] = await Promise.all([
    getFinancialKPIs(startDate, endDate),
    getProfitLossReport(startDate, endDate),
    getExpenseAnalysisReport(startDate, endDate),
    getRevenueAnalysisReport(startDate, endDate),
  ]);

  const kpiData = kpisResult.success ? kpisResult.data : null;
  const profitLossData = profitLossResult.success
    ? profitLossResult.data
    : null;
  const expenseAnalysisData = expenseAnalysisResult.success
    ? expenseAnalysisResult.data
    : null;
  const revenueAnalysisData = revenueAnalysisResult.success
    ? revenueAnalysisResult.data
    : null;

  return (
    <ReportsAnalytics
      initialKpiData={kpiData}
      initialProfitLossData={profitLossData}
      initialExpenseAnalysisData={expenseAnalysisData}
      initialRevenueAnalysisData={revenueAnalysisData}
      initialDateRange="current-month"
    />
  );
}
