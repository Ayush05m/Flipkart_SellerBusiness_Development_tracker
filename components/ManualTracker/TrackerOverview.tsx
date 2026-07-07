'use client';

import { useState } from 'react';
import {
  IndianRupee,
  Wallet,
  Clock,
  RefreshCcw,
  ShoppingCart,
  Receipt,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Package,
  CornerDownLeft,
  PackageCheck,
  PackageX,
  ShieldAlert,
  FileText,
  Plus,
  Trash2,
  BadgeIndianRupee,
  Banknote,
  CircleDollarSign,
  CheckCircle2,
} from 'lucide-react';
import { MetricCard } from '../Dashboard/MetricCard';
import { ProfitTrendChart } from '../Charts/ProfitTrendChart';
import { FeesBreakdownChart } from '../Charts/FeesBreakdownChart';
import { TrackerTable } from './TrackerTable';
import { useManualTracker, SpfClaim, MiscCost, SettlementPayment } from '../../lib/manualTrackerStore';
import { Sheet } from '../UI/Sheet';

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function TrackerOverview() {
  const store = useManualTracker();
  const {
    metrics,
    spfClaims,
    miscCosts,
    settlementPayments,
    addSpfClaim,
    deleteSpfClaim,
    addMiscCost,
    deleteMiscCost,
    addSettlementPayment,
    deleteSettlementPayment,
  } = store;

  const [isSpfSheetOpen, setIsSpfSheetOpen] = useState(false);
  const [newSpf, setNewSpf] = useState<Partial<SpfClaim>>({ date: new Date().toISOString().split('T')[0], amount: 0, orderId: '', note: '', status: 'Approved' });

  const [isMiscSheetOpen, setIsMiscSheetOpen] = useState(false);
  const [newMisc, setNewMisc] = useState<Partial<MiscCost>>({ date: new Date().toISOString().split('T')[0], amount: 0, note: '' });

  const [isSettlementSheetOpen, setIsSettlementSheetOpen] = useState(false);
  const [newSettlement, setNewSettlement] = useState<Partial<SettlementPayment>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    note: '',
  });

  const handleAddSpf = () => {
    if (!newSpf.amount || !newSpf.note) return;
    addSpfClaim(newSpf as any);
    setNewSpf({ date: new Date().toISOString().split('T')[0], amount: 0, orderId: '', note: '', status: 'Approved' });
  };

  const handleAddMisc = () => {
    if (!newMisc.amount || !newMisc.note) return;
    addMiscCost(newMisc as any);
    setNewMisc({ date: new Date().toISOString().split('T')[0], amount: 0, note: '' });
  };

  const handleAddSettlement = () => {
    if (!newSettlement.amount || !newSettlement.note) return;
    addSettlementPayment(newSettlement as any);
    setNewSettlement({ date: new Date().toISOString().split('T')[0], amount: 0, note: '' });
  };

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
        {/* Additional Trackers */}
        <MetricCard
          title="SPF Claims (Approved)"
          value={formatAmount(metrics.totalSpfApprovedAmount)}
          trend={0}
          icon={ShieldAlert}
          colorClass="text-info"
          trendLabel="tracked separately"
          onClick={() => setIsSpfSheetOpen(true)}
        />
        <MetricCard
          title="Misc Costs"
          value={formatAmount(metrics.totalMiscCosts)}
          trend={0}
          icon={FileText}
          colorClass="text-danger"
          trendLabel="tracked separately"
          onClick={() => setIsMiscSheetOpen(true)}
        />
      </div>

      {/* Order breakdown and Returns Detail */}
      <div className="dashboard-grid grid-cols-2" style={{ marginBottom: '1.5rem' }}>
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
              <small>Sellable</small>
            </div>
            <div className="breakdown-item">
              <PackageX size={14} style={{ color: 'var(--danger)' }} />
              <span>{metrics.returnedDamagedOrders}</span>
              <small>Damaged</small>
            </div>
            <div className="breakdown-item">
              <IndianRupee size={14} style={{ color: 'var(--success)' }} />
              <span>₹{formatAmount(metrics.returnSellableLosses)}</span>
              <small>Sellable Loss</small>
            </div>
            <div className="breakdown-item">
              <IndianRupee size={14} style={{ color: 'var(--danger)' }} />
              <span>₹{formatAmount(metrics.returnDamagedLosses)}</span>
              <small>Damaged Loss</small>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Settlement Tracker Panel ─────────────────────────────── */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          border: '1px solid rgba(59,130,246,0.25)',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(16,185,129,0.04) 100%)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BadgeIndianRupee size={18} style={{ color: 'var(--info)' }} />
              Flipkart Settlement Tracker
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
              Track what Flipkart owes you vs what you&apos;ve received · only secured (return-window-closed) orders
            </p>
          </div>
          <button
            className="source-pill flipkart"
            style={{ fontSize: '0.78rem', gap: '0.35rem' }}
            onClick={() => setIsSettlementSheetOpen(true)}
          >
            <Plus size={13} /> Log Payment
          </button>
        </div>

        {/* Three summary columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Total Due */}
          <div
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <CircleDollarSign size={15} style={{ color: 'var(--info)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Settlement Due</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--info)', lineHeight: 1 }}>
              ₹{formatAmount(metrics.totalSettlementDue)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
              From {metrics.securedOrders} secured order{metrics.securedOrders !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Received */}
          <div
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Banknote size={15} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment Received</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>
              ₹{formatAmount(metrics.totalSettlementReceived)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
              {settlementPayments.length} payment{settlementPayments.length !== 1 ? 's' : ''} logged
            </div>
          </div>

          {/* Remaining */}
          <div
            style={{
              background: metrics.settlementRemaining <= 0
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(239,68,68,0.08)',
              border: `1px solid ${metrics.settlementRemaining <= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '12px',
              padding: '1rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <CheckCircle2 size={15} style={{ color: metrics.settlementRemaining <= 0 ? 'var(--success)' : 'var(--danger)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Remaining Balance</span>
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: metrics.settlementRemaining <= 0 ? 'var(--success)' : 'var(--danger)',
                lineHeight: 1,
              }}
            >
              ₹{formatAmount(Math.abs(metrics.settlementRemaining))}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
              {metrics.settlementRemaining <= 0
                ? metrics.settlementRemaining === 0 ? 'Fully settled ✓' : `Overpaid by ₹${formatAmount(Math.abs(metrics.settlementRemaining))}`
                : 'Still to be received from Flipkart'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {metrics.totalSettlementDue > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Settlement progress</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {Math.min(100, Math.round((metrics.totalSettlementReceived / metrics.totalSettlementDue) * 100))}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (metrics.totalSettlementReceived / metrics.totalSettlementDue) * 100)}%`,
                  background: metrics.settlementRemaining <= 0
                    ? 'var(--success)'
                    : 'linear-gradient(90deg, var(--info), var(--success))',
                  borderRadius: '999px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Charts — mirrors the main dashboard */}
      <div className="dashboard-grid grid-cols-2" style={{ marginBottom: '0' }}>
        <ProfitTrendChart data={metrics.revenueTrend} />
        <FeesBreakdownChart data={metrics.feeBreakdown} />
      </div>

      {/* Order ledger table */}
      <TrackerTable store={store} />

      {/* SPF Claims Sheet */}
      <Sheet isOpen={isSpfSheetOpen} onClose={() => setIsSpfSheetOpen(false)} title="SPF Claims">
        <div className="flex-col gap-3">
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Add New Claim</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="date" className="cp-input-wrapper" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} value={newSpf.date} onChange={(e) => setNewSpf({ ...newSpf, date: e.target.value })} />
              <input type="number" placeholder="Amount (₹)" className="cp-input-wrapper" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} value={newSpf.amount || ''} onChange={(e) => setNewSpf({ ...newSpf, amount: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="text" placeholder="Order ID (Optional)" className="cp-input-wrapper" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} value={newSpf.orderId} onChange={(e) => setNewSpf({ ...newSpf, orderId: e.target.value })} />
              <select className="tracker-status-select" style={{ padding: '0.5rem', borderRadius: '4px' }} value={newSpf.status} onChange={(e) => setNewSpf({ ...newSpf, status: e.target.value as any })}>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <textarea placeholder="Note" className="cp-input-wrapper" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', marginBottom: '0.5rem', resize: 'vertical' }} value={newSpf.note} onChange={(e) => setNewSpf({ ...newSpf, note: e.target.value })} />
            <button className="source-pill flipkart" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAddSpf}><Plus size={14} /> Add Claim</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {spfClaims.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '0.875rem' }}>No claims tracked yet.</p> : null}
            {[...spfClaims].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((claim) => (
              <div key={claim.id} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>₹{claim.amount}</strong>
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: claim.status === 'Approved' ? 'rgba(16,185,129,0.2)' : claim.status === 'Rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: claim.status === 'Approved' ? 'var(--success)' : claim.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)' }}>{claim.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{new Date(claim.date).toLocaleDateString()} {claim.orderId && `• ${claim.orderId}`}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{claim.note}</div>
                </div>
                <button className="icon-action-btn" onClick={() => deleteSpfClaim(claim.id)}><Trash2 size={14} className="text-danger" /></button>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* Misc Costs Sheet */}
      <Sheet isOpen={isMiscSheetOpen} onClose={() => setIsMiscSheetOpen(false)} title="Miscellaneous Costs">
        <div className="flex-col gap-3">
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Add New Cost</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="date" className="cp-input-wrapper" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} value={newMisc.date} onChange={(e) => setNewMisc({ ...newMisc, date: e.target.value })} />
              <input type="number" placeholder="Amount (₹)" className="cp-input-wrapper" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} value={newMisc.amount || ''} onChange={(e) => setNewMisc({ ...newMisc, amount: Number(e.target.value) })} />
            </div>
            <textarea placeholder="Note / Description" className="cp-input-wrapper" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', marginBottom: '0.5rem', resize: 'vertical' }} value={newMisc.note} onChange={(e) => setNewMisc({ ...newMisc, note: e.target.value })} />
            <button className="source-pill local-import" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAddMisc}><Plus size={14} /> Add Cost</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {miscCosts.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '0.875rem' }}>No costs tracked yet.</p> : null}
            {[...miscCosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((cost) => (
              <div key={cost.id} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>₹{cost.amount}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{new Date(cost.date).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{cost.note}</div>
                </div>
                <button className="icon-action-btn" onClick={() => deleteMiscCost(cost.id)}><Trash2 size={14} className="text-danger" /></button>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* Settlement Payment Log Sheet */}
      <Sheet isOpen={isSettlementSheetOpen} onClose={() => setIsSettlementSheetOpen(false)} title="Settlement Payments">
        <div className="flex-col gap-3">
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Log New Payment</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="date"
                className="cp-input-wrapper"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }}
                value={newSettlement.date}
                onChange={(e) => setNewSettlement({ ...newSettlement, date: e.target.value })}
              />
              <input
                type="number"
                placeholder="Amount received (₹)"
                className="cp-input-wrapper"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }}
                value={newSettlement.amount || ''}
                onChange={(e) => setNewSettlement({ ...newSettlement, amount: Number(e.target.value) })}
              />
            </div>
            <textarea
              placeholder="Note (e.g. Week 2 June settlement, UTR: 1234)"
              className="cp-input-wrapper"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', marginBottom: '0.5rem', resize: 'vertical' }}
              value={newSettlement.note}
              onChange={(e) => setNewSettlement({ ...newSettlement, note: e.target.value })}
            />
            <button className="source-pill flipkart" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAddSettlement}>
              <Plus size={14} /> Add Payment
            </button>
          </div>

          {/* Summary line inside sheet */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.6rem 0.8rem',
              background: 'rgba(59,130,246,0.08)',
              borderRadius: '8px',
              marginBottom: '0.5rem',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Total Received</span>
            <strong style={{ color: 'var(--success)' }}>₹{formatAmount(metrics.totalSettlementReceived)}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.6rem 0.8rem',
              background: metrics.settlementRemaining <= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              borderRadius: '8px',
              marginBottom: '0.75rem',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Remaining Balance</span>
            <strong style={{ color: metrics.settlementRemaining <= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ₹{formatAmount(Math.abs(metrics.settlementRemaining))}
              {metrics.settlementRemaining <= 0 && metrics.settlementRemaining !== 0 ? ' (overpaid)' : ''}
            </strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {settlementPayments.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '0.875rem' }}>No payments logged yet.</p>
            ) : null}
            {[...settlementPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((payment) => (
              <div key={payment.id} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: 'var(--success)' }}>₹{formatAmount(payment.amount)}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{payment.note}</div>
                </div>
                <button className="icon-action-btn" onClick={() => deleteSettlementPayment(payment.id)}>
                  <Trash2 size={14} className="text-danger" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
