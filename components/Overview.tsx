'use client';

import { IndianRupee, Wallet, Receipt, RefreshCcw, ShoppingCart } from 'lucide-react';
import { MetricCard } from './Dashboard/MetricCard';
import { ProfitTrendChart } from './Charts/ProfitTrendChart';
import { FeesBreakdownChart } from './Charts/FeesBreakdownChart';
import { ProductPerformanceTable } from './Dashboard/ProductPerformanceTable';
import { useFlipkartDashboard } from '../lib/flipkart';

export function Overview() {
  const state = useFlipkartDashboard();
  const { dashboardData } = state;

  return (
    <div className="overview-page">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Dashboard Overview
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          &ldquo;After all commissions, shipping charges, returns, and fees, how much money am I actually making?&rdquo;
        </p>
      </div>

      <div className="dashboard-grid grid-cols-5" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Gross Revenue"
          value={dashboardData.metrics[0].value}
          trend={dashboardData.metrics[0].trend}
          icon={IndianRupee}
          colorClass="text-info"
          tooltip={"Total sales generated before any deductions or fees.\n\nFormula: Σ Selling Price of all fulfilled orders."}
        />
        <MetricCard
          title="Net Profit"
          value={dashboardData.metrics[1].value}
          trend={dashboardData.metrics[1].trend}
          icon={Wallet}
          colorClass="text-success"
          tooltip={"Your actual take-home profit after subtracting all fees, return losses, and product costs.\n\nFormula: Settlement Amount − Cost Price − Return Losses."}
        />
        <MetricCard
          title="Total Fees"
          value={dashboardData.metrics[2].value}
          trend={dashboardData.metrics[2].trend}
          icon={Receipt}
          colorClass="text-warning"
          trendLabel="settlement + returns"
          tooltip={"The combined total of all Flipkart commissions, fixed fees, collection fees, and shipping charges deducted from your settlements."}
        />
        <MetricCard
          title="Return Losses"
          value={dashboardData.metrics[3].value}
          trend={dashboardData.metrics[3].trend}
          icon={RefreshCcw}
          colorClass="text-danger"
          trendLabel="loss from returns"
          tooltip={"The financial loss incurred from customer returns and courier returns.\n\nFormula: Forward shipping + Reverse shipping fees + any lost product cost (if damaged)."}
        />
        <MetricCard
          title="Investment Cost"
          value={dashboardData.metrics[4].value}
          trend={dashboardData.metrics[4].trend}
          icon={ShoppingCart}
          colorClass="text-accent"
          trendLabel="total cost price"
          tooltip={"The total base cost of the goods you have sold.\n\nFormula: Σ Cost Price of all fulfilled non-returned products."}
        />
      </div>

      <div className="dashboard-grid grid-cols-2">
        <ProfitTrendChart data={dashboardData.revenueTrend} />
        <FeesBreakdownChart data={dashboardData.feeBreakdown} />
      </div>

      <ProductPerformanceTable
        products={state.products}
        feedSource={state.feedSource}
        message={state.message}
        costPrices={state.costPrices}
        miscExpenses={state.miscExpenses}
        isLoaded={state.isLoaded}
        isRefreshing={state.isRefreshing}
        onCpChange={state.handleCpChange}
        onMiscChange={state.handleMiscChange}
        onRefresh={state.loadProducts}
        onImport={state.handleImport}
      />
    </div>
  );
}
