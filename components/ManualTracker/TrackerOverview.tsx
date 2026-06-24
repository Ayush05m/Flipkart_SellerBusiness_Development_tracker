'use client';

import {
  IndianRupee,
  Wallet,
  Clock,
  RefreshCcw,
  ShoppingCart,
  Receipt,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Package,
  BarChart3,
  CornerDownLeft,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import { MetricCard } from '../Dashboard/MetricCard';
import { ProfitTrendChart } from '../Charts/ProfitTrendChart';
import { FeesBreakdownChart } from '../Charts/FeesBreakdownChart';
import { TrackerTable } from './TrackerTable';
import { useManualTracker } from '../../lib/manualTrackerStore';

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function TrackerOverview() {
  const store = useManualTracker();
  const { metrics } = store;

  return (
    <div className="overview-page">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Manual Order Tracker
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          &ldquo;Track individual orders manually — see your secured vs at-risk profits dynamically as return windows expire.&rdquo;
        </p>
      </div>

      {/* Primary Metric Cards — mirrors the main dashboard */}
      <div className="dashboard-grid grid-cols-5" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Gross Revenue"
          value={formatAmount(metrics.grossRevenue)}
          trend={0}
          icon={IndianRupee}
          colorClass="text-info"
          trendLabel={`${metrics.deliveredOrders + metrics.returnPeriodOngoingOrders} orders`}
        />
        <MetricCard
          title="Net Profit"
          value={formatAmount(metrics.netProfit)}
          trend={metrics.profitMargin}
          icon={Wallet}
          colorClass={metrics.netProfit >= 0 ? 'text-success' : 'text-danger'}
          trendLabel="margin %"
        />
        <MetricCard
          title="GST & Taxes"
          value={formatAmount(metrics.gstAndTaxes)}
          trend={0}
          icon={Receipt}
          colorClass="text-warning"
          trendLabel="SP − settlement deductions"
        />
        <MetricCard
          title="Return Losses"
          value={formatAmount(metrics.returnLosses)}
          trend={metrics.returnRate}
          icon={RefreshCcw}
          colorClass="text-danger"
          trendLabel="return rate %"
        />
        <MetricCard
          title="Investment Cost"
          value={formatAmount(metrics.investmentCost)}
          trend={metrics.roi}
          icon={ShoppingCart}
          colorClass="text-accent"
          trendLabel="ROI %"
        />
      </div>

      {/* Secondary metric row — Secured vs At-Risk breakdown */}
      <div className="dashboard-grid grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Secured Profit"
          value={formatAmount(metrics.securedProfit)}
          trend={0}
          icon={ShieldCheck}
          colorClass="text-success"
          trendLabel={`${metrics.securedOrders} orders secured`}
        />
        <MetricCard
          title="At-Risk Profit"
          value={formatAmount(metrics.atRiskProfit)}
          trend={0}
          icon={AlertTriangle}
          colorClass="text-warning"
          trendLabel={`${metrics.inTransitOrders + metrics.returnPeriodOngoingOrders} orders pending`}
        />
        <div className="metric-card glass-panel animate-fade-in">
          <div className="metric-header flex-between">
            <h3 className="metric-title">Order Breakdown</h3>
            <div className="metric-icon-wrapper text-info">
              <Package size={20} />
            </div>
          </div>
          <div className="order-breakdown-grid">
            <div className="breakdown-item">
              <Truck size={14} style={{ color: 'var(--warning)' }} />
              <span>{metrics.inTransitOrders}</span>
              <small>Transit</small>
            </div>
            <div className="breakdown-item">
              <Clock size={14} style={{ color: 'var(--info)' }} />
              <span>{metrics.returnPeriodOngoingOrders}</span>
              <small>Return Window</small>
            </div>
            <div className="breakdown-item">
              <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
              <span>{metrics.securedOrders}</span>
              <small>Secured</small>
            </div>
            <div className="breakdown-item">
              <CornerDownLeft size={14} style={{ color: '#a855f7' }} />
              <span>{metrics.returnInTransitOrders}</span>
              <small>Ret. Transit</small>
            </div>
          </div>
        </div>
        <div className="metric-card glass-panel animate-fade-in">
          <div className="metric-header flex-between">
            <h3 className="metric-title">Returns Detail</h3>
            <div className="metric-icon-wrapper text-danger">
              <RefreshCcw size={20} />
            </div>
          </div>
          <div className="order-breakdown-grid">
            <div className="breakdown-item">
              <PackageCheck size={14} style={{ color: 'var(--success)' }} />
              <span>{metrics.returnedGoodOrders}</span>
              <small>Good</small>
            </div>
            <div className="breakdown-item">
              <PackageX size={14} style={{ color: 'var(--danger)' }} />
              <span>{metrics.returnedDamagedOrders}</span>
              <small>Damaged</small>
            </div>
            <div className="breakdown-item">
              <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
              <span>{metrics.returnRate.toFixed(1)}%</span>
              <small>Return %</small>
            </div>
            <div className="breakdown-item">
              <IndianRupee size={14} style={{ color: 'var(--danger)' }} />
              <span>₹{formatAmount(metrics.reverseShippingTotal)}</span>
              <small>Ship Fees</small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts — mirrors the main dashboard */}
      <div className="dashboard-grid grid-cols-2" style={{ marginBottom: '0' }}>
        <ProfitTrendChart data={metrics.revenueTrend} />
        <FeesBreakdownChart data={metrics.feeBreakdown} />
      </div>

      {/* Order ledger table */}
      <TrackerTable store={store} />
    </div>
  );
}
