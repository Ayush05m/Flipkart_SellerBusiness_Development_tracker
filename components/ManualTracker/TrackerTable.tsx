'use client';

import React, { useState, useMemo, ChangeEvent } from 'react';
import {
  Plus,
  Trash2,
  ShieldCheck,
  Clock,
  Truck,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Search,
  CornerDownLeft,
  PackageX,
  PackageCheck,
  Download,
  Upload,
} from 'lucide-react';
import { ManualOrder, OrderStatus, ReturnCondition, ReturnTypeVal, useManualTracker } from '../../lib/manualTrackerStore';
import { Modal } from '../UI/Modal';
import { Sheet } from '../UI/Sheet';

interface TrackerTableProps {
  store: ReturnType<typeof useManualTracker>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_OPTIONS: OrderStatus[] = [
  'In Transit',
  'Delivered',
  'Return In Transit',
  'Returned',
];

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  'In Transit': {
    color: 'var(--warning)',
    bg: 'rgba(245, 158, 11, 0.12)',
    icon: Truck,
    label: 'In Transit',
  },
  'Delivered': {
    color: 'var(--success)',
    bg: 'rgba(16, 185, 129, 0.12)',
    icon: ShieldCheck,
    label: 'Delivered',
  },
  'Return Period Ongoing': {
    color: 'var(--info)',
    bg: 'rgba(59, 130, 246, 0.12)',
    icon: Clock,
    label: 'Return Window',
  },
  'Return In Transit': {
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    icon: CornerDownLeft,
    label: 'Return In Transit',
  },
  'Returned': {
    color: 'var(--danger)',
    bg: 'rgba(239, 68, 68, 0.12)',
    icon: RefreshCcw,
    label: 'Returned',
  },
};

const EMPTY_NEW_ORDER: Omit<ManualOrder, 'id'> = {
  productName: '',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: undefined,
  costPrice: 0,
  sellingPrice: 0,
  settlementPrice: 0,
  shippingFee: 0,
  returnDurationDays: 10,
  status: 'In Transit',
  returnCondition: 'Good',
  returnType: 'RVP',
  reverseShippingFee: 0,
};

export function TrackerTable({ store }: TrackerTableProps) {
  const { orders, addOrder, updateOrder, deleteOrder, importData, getEffectiveStatus, getDaysLeft, spfClaims, miscCosts } = store;
  
  // Modal & Sheet State
  const [isAdding, setIsAdding] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManualOrder | null>(null);
  
  // Form State
  const [newOrder, setNewOrder] = useState<Omit<ManualOrder, 'id'>>(EMPTY_NEW_ORDER);
  const [editOrder, setEditOrder] = useState<ManualOrder | null>(null);

  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [importMessage, setImportMessage] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const effective = getEffectiveStatus(order);
      const matchesStatus = filterStatus === 'All' || effective === filterStatus;
      const matchesSearch = !searchQuery || order.productName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchQuery, getEffectiveStatus]);

  const handleAddSubmit = () => {
    if (!newOrder.productName) return;
    addOrder(newOrder);
    setIsAdding(false);
    setNewOrder(EMPTY_NEW_ORDER);
  };

  const handleEditSubmit = () => {
    if (!editOrder || !editOrder.productName) return;
    updateOrder(editOrder.id, editOrder);
    setIsSheetOpen(false);
    setEditOrder(null);
    setSelectedOrder(null);
  };

  const handleRowClick = (order: ManualOrder) => {
    setSelectedOrder(order);
    setEditOrder(order);
    setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteOrder(id);
      setIsSheetOpen(false);
      setEditOrder(null);
      setSelectedOrder(null);
    }
  };

  const isReturnRelated = (status: OrderStatus) =>
    status === 'Returned' || status === 'Return In Transit';

  // ── Export / Import ──────────────────────────────────────

  const handleExport = () => {
    const payload = {
      version: 1,
      orders,
      spfClaims,
      miscCosts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flipkart-orders-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setImportMessage('Reading file…');
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsText(file);
      });

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportMessage('Import failed — file is not valid JSON.');
        return;
      }

      let rawOrders: any[] = [];
      let rawSpf: any[] = [];
      let rawMisc: any[] = [];

      if (Array.isArray(parsed)) {
        // Legacy fallback
        rawOrders = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Unified format
        rawOrders = Array.isArray(parsed.orders) ? parsed.orders : [];
        rawSpf = Array.isArray(parsed.spfClaims) ? parsed.spfClaims : [];
        rawMisc = Array.isArray(parsed.miscCosts) ? parsed.miscCosts : [];
      } else {
        setImportMessage('Invalid file format.');
        return;
      }

      // Validate & migrate each order row
      const finalOrders: ManualOrder[] = rawOrders
        .filter((row: any) => row && typeof row === 'object' && row.productName)
        .map((row: any) => ({
          id: row.id || `mt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          productName: String(row.productName || ''),
          orderDate: String(row.orderDate || new Date().toISOString().split('T')[0]),
          deliveryDate: row.deliveryDate ? String(row.deliveryDate) : undefined,
          costPrice: Number(row.costPrice) || 0,
          sellingPrice: Number(row.sellingPrice) || 0,
          settlementPrice: Number(row.settlementPrice ?? row.settlementAmount) || 0,
          shippingFee: Number(row.shippingFee) || 0,
          returnDurationDays: Number(row.returnDurationDays) || 10,
          status: STATUS_OPTIONS.includes(row.status) ? row.status : 'In Transit',
          returnCondition: (['Good', 'Damaged'] as ReturnCondition[]).includes(row.returnCondition)
            ? row.returnCondition
            : 'Good',
          returnType: row.returnType === 'RTO' ? 'RTO' : 'RVP',
          reverseShippingFee: row.returnType === 'RTO' ? 0 : (Number(row.reverseShippingFee) || 0),
        }));

      // Validate SPF and Misc
      const finalSpf = rawSpf.filter(c => c && c.productName && c.amount).map(c => ({
        id: c.id || `spf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productName: String(c.productName),
        amount: Number(c.amount) || 0,
        status: (['Pending', 'Approved', 'Rejected'] as any[]).includes(c.status) ? c.status : 'Pending',
        date: String(c.date || new Date().toISOString().split('T')[0]),
        note: String(c.note || '')
      }));

      const finalMisc = rawMisc.filter(c => c && c.description && c.amount).map(c => ({
        id: c.id || `misc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        description: String(c.description),
        amount: Number(c.amount) || 0,
        date: String(c.date || new Date().toISOString().split('T')[0]),
        note: String(c.note || '')
      }));

      if (!finalOrders.length && !finalSpf.length && !finalMisc.length) {
        setImportMessage('No valid data found in the file.');
        alert('No valid data found in the file.');
        return;
      }

      importData({ orders: finalOrders, spfClaims: finalSpf, miscCosts: finalMisc });
      const successMsg = `✓ Imported ${finalOrders.length} orders, ${finalSpf.length} claims, ${finalMisc.length} costs.`;
      setImportMessage(successMsg);
      alert(successMsg); // explicit fallback so we know it worked
      setTimeout(() => setImportMessage(''), 6000);
    } catch (error) {
      console.error('File import error:', error);
      const errMsg = 'Import failed — unexpected error reading the file.';
      setImportMessage(errMsg);
      alert(errMsg);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleImportFile(file);
    // Reset value so the same file can be re-selected next time
    event.target.value = '';
  };

  const getReturnStatusBadge = (order: ManualOrder) => {
    const effective = getEffectiveStatus(order);
    const config = STATUS_CONFIG[effective];
    const StatusIcon = config.icon;

    if (effective === 'Return Period Ongoing') {
      const days = getDaysLeft(order);
      return (
        <div className="return-status-badge" style={{ color: config.color, background: config.bg }}>
          <StatusIcon size={14} />
          <span>{days}d left</span>
        </div>
      );
    }

    if (effective === 'Delivered' && order.status !== 'In Transit') {
      return (
        <div className="return-status-badge" style={{ color: config.color, background: config.bg }}>
          <ShieldCheck size={14} />
          <span>Secured</span>
        </div>
      );
    }

    if (effective === 'Returned') {
      const CondIcon = order.returnCondition === 'Good' ? PackageCheck : PackageX;
      const condColor = order.returnCondition === 'Good' ? 'var(--success)' : 'var(--danger)';
      const condBg = order.returnCondition === 'Good' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
      return (
        <div className="return-status-badge" style={{ color: condColor, background: condBg }}>
          <CondIcon size={14} />
          <span>{order.returnCondition === 'Good' ? 'Good (Sellable)' : 'Damaged'}</span>
        </div>
      );
    }

    if (effective === 'Return In Transit') {
      return (
        <div className="return-status-badge" style={{ color: config.color, background: config.bg }}>
          <StatusIcon size={14} />
          <span>Returning…</span>
        </div>
      );
    }

    return (
      <div className="return-status-badge" style={{ color: config.color, background: config.bg }}>
        <StatusIcon size={14} />
        <span>{config.label}</span>
      </div>
    );
  };

  const getOrderProfitBadge = (order: ManualOrder) => {
    const effective = getEffectiveStatus(order);

    if (effective === 'Returned') {
      let loss: number;
      if (order.returnCondition === 'Good') {
        // Only shipping fees are lost; investment recovered
        loss = order.shippingFee + order.reverseShippingFee;
      } else {
        // Cost price + shipping fees lost (product is damaged/unsellable)
        loss = order.costPrice + order.shippingFee + order.reverseShippingFee;
      }
      return (
        <div className="profit-badge negative" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
          <TrendingDown size={14} />
          <span>−{formatCurrency(loss)}</span>
        </div>
      );
    }

    if (effective === 'Return In Transit') {
      return (
        <div className="profit-badge neutral" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
          <Clock size={14} />
          <span>Pending</span>
        </div>
      );
    }

    const profit = order.settlementPrice - order.costPrice;
    const isProfitable = profit > 0;
    const isLoss = profit < 0;

    return (
      <div className={`profit-badge ${isProfitable ? 'positive' : isLoss ? 'negative' : 'neutral'}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
        {isProfitable ? <TrendingUp size={14} /> : isLoss ? <TrendingDown size={14} /> : <IndianRupee size={14} />}
        <span>{formatCurrency(profit)}</span>
      </div>
    );
  };

  // Inline summary tiles
  const orderCounts = useMemo(() => {
    let inTransit = 0, returnWindow = 0, secured = 0, returned = 0, returnInTransit = 0;
    orders.forEach((o) => {
      const s = getEffectiveStatus(o);
      if (s === 'In Transit') inTransit++;
      else if (s === 'Return Period Ongoing') returnWindow++;
      else if (s === 'Delivered') secured++;
      else if (s === 'Returned') returned++;
      else if (s === 'Return In Transit') returnInTransit++;
    });
    return { inTransit, returnWindow, secured, returned, returnInTransit };
  }, [orders, getEffectiveStatus]);

  // Form field renderer for reuse in Modal and Sheet
  const renderOrderForm = (orderState: Partial<ManualOrder>, onChange: (updates: Partial<ManualOrder>) => void) => (
    <div className="flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Product Name</label>
        <input
          type="text"
          className="cp-input-wrapper"
          style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
          placeholder="e.g. Wireless Mouse"
          value={orderState.productName || ''}
          onChange={(e) => onChange({ productName: e.target.value })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Order Date</label>
          <input
            type="date"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.orderDate || ''}
            onChange={(e) => onChange({ orderDate: e.target.value })}
          />
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Delivery Date (Optional)</label>
          <input
            type="date"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.deliveryDate || ''}
            onChange={(e) => onChange({ deliveryDate: e.target.value || undefined })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cost Price (₹)</label>
          <input
            type="number"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.costPrice === 0 && !orderState.productName ? '' : orderState.costPrice}
            onChange={(e) => onChange({ costPrice: Number(e.target.value) })}
          />
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Selling Price (₹)</label>
          <input
            type="number"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.sellingPrice === 0 && !orderState.productName ? '' : orderState.sellingPrice}
            onChange={(e) => onChange({ sellingPrice: Number(e.target.value) })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Settlement (₹)</label>
          <input
            type="number"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.settlementPrice === 0 && !orderState.productName ? '' : orderState.settlementPrice}
            onChange={(e) => onChange({ settlementPrice: Number(e.target.value) })}
          />
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Shipping Fee (₹)</label>
          <input
            type="number"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.shippingFee === 0 && !orderState.productName ? '' : orderState.shippingFee}
            onChange={(e) => onChange({ shippingFee: Number(e.target.value) })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</label>
          <select
            className="tracker-status-select"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
            value={orderState.status}
            onChange={(e) => onChange({ status: e.target.value as OrderStatus })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Return Duration (Days)</label>
          <input
            type="number"
            className="cp-input-wrapper"
            style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}
            value={orderState.returnDurationDays}
            onChange={(e) => onChange({ returnDurationDays: Number(e.target.value) })}
          />
        </div>
      </div>

      {orderState.status && isReturnRelated(orderState.status as OrderStatus) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px dashed var(--danger)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>Return Type</label>
              <select
                className="tracker-status-select"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', borderColor: 'var(--danger)' }}
                value={orderState.returnType || 'RVP'}
                onChange={(e) => {
                  const val = e.target.value as ReturnTypeVal;
                  onChange({ returnType: val, reverseShippingFee: val === 'RTO' ? 0 : orderState.reverseShippingFee });
                }}
              >
                <option value="RVP">RVP (Reverse Pickup)</option>
                <option value="RTO">RTO (Return To Origin)</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>Return Condition</label>
              <select
                className="tracker-status-select"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', borderColor: 'var(--danger)' }}
                value={orderState.returnCondition}
                onChange={(e) => onChange({ returnCondition: e.target.value as ReturnCondition })}
              >
                <option value="Good">Good (Sellable)</option>
                <option value="Damaged">Damaged / Used</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>
              Reverse Shipping Fee (₹) {orderState.returnType === 'RTO' && '(N/A for RTO)'}
            </label>
            <input
              type="number"
              className="cp-input-wrapper"
              disabled={orderState.returnType === 'RTO'}
              style={{ width: '100%', padding: '0.5rem', color: 'white', border: '1px solid var(--danger)', borderRadius: '6px', background: 'var(--bg-tertiary)', opacity: orderState.returnType === 'RTO' ? 0.5 : 1 }}
              value={orderState.reverseShippingFee === 0 && orderState.returnType !== 'RTO' ? '' : orderState.reverseShippingFee}
              onChange={(e) => onChange({ reverseShippingFee: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="glass-panel performance-table-container">
      <div className="table-header-section flex-between">
        <div>
          <h3 className="table-title">Order Ledger</h3>
          <p className="table-subtitle">
            Track individual orders — return windows auto-expire, profits recalculate dynamically
          </p>
        </div>
        <div className="table-actions">
          <div className="search-container flex-center" style={{ width: '220px', height: '36px' }}>
            <Search size={14} className="search-icon text-secondary" />
            <input
              type="text"
              placeholder="Search product..."
              className="search-input"
              style={{ fontSize: '0.8rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="tracker-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'All')}
          >
            <option value="All">All Orders ({orders.length})</option>
            <option value="In Transit">In Transit ({orderCounts.inTransit})</option>
            <option value="Return Period Ongoing">Return Window ({orderCounts.returnWindow})</option>
            <option value="Delivered">Secured ({orderCounts.secured})</option>
            <option value="Return In Transit">Return In Transit ({orderCounts.returnInTransit})</option>
            <option value="Returned">Returned ({orderCounts.returned})</option>
          </select>
          <button
            className="icon-action-btn"
            type="button"
            onClick={handleExport}
            title="Export orders as JSON"
            disabled={orders.length === 0}
          >
            <Download size={17} />
          </button>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              className="icon-action-btn"
              type="button"
              title="Import orders from JSON"
              style={{ pointerEvents: 'none' }}
            >
              <Upload size={17} />
            </button>
            <input
              type="file"
              accept="application/json,.json"
              title="Import orders from JSON"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
              onChange={handleFileInputChange}
            />
          </div>
          <button
            className="source-pill flipkart"
            style={{ cursor: 'pointer', gap: '0.5rem' }}
            onClick={() => {
              setNewOrder(EMPTY_NEW_ORDER);
              setIsAdding(true);
            }}
          >
            <Plus size={16} />
            Add Order
          </button>
        </div>
      </div>

      {/* Import status message */}
      {importMessage && (
        <div className="status-message" style={importMessage.startsWith('✓') ? { color: 'var(--success)', background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.18)' } : undefined}>
          <span>{importMessage}</span>
        </div>
      )}

      {/* Quick summary bar */}
      <div className="profit-summary-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <div className="summary-tile">
          <span>In Transit</span>
          <strong style={{ color: 'var(--warning)' }}>{orderCounts.inTransit}</strong>
        </div>
        <div className="summary-tile">
          <span>Return Window</span>
          <strong style={{ color: 'var(--info)' }}>{orderCounts.returnWindow}</strong>
        </div>
        <div className="summary-tile">
          <span>Secured</span>
          <strong style={{ color: 'var(--success)' }}>{orderCounts.secured}</strong>
        </div>
        <div className="summary-tile">
          <span>Return In Transit</span>
          <strong style={{ color: '#a855f7' }}>{orderCounts.returnInTransit}</strong>
        </div>
        <div className="summary-tile">
          <span>Returned</span>
          <strong style={{ color: 'var(--danger)' }}>{orderCounts.returned}</strong>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Order Date</th>
              <th>Delivery Date</th>
              <th>Status</th>
              <th>Return Period</th>
              <th className="text-right">Profit/Loss</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const effectiveStatus = getEffectiveStatus(order);
              const statusConfig = STATUS_CONFIG[effectiveStatus];

              return (
                <tr
                  key={order.id}
                  onClick={() => handleRowClick(order)}
                  style={{
                    borderLeft: `3px solid ${statusConfig.color}`,
                    cursor: 'pointer',
                  }}
                  className="hover-row"
                >
                  <td className="font-medium">{order.productName}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {new Date(order.orderDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      className="cp-input-wrapper"
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', fontSize: '0.8rem' }}
                      value={order.deliveryDate || ''}
                      onChange={(e) => updateOrder(order.id, { deliveryDate: e.target.value || undefined })}
                    />
                  </td>
                  <td>
                    <span style={{ color: statusConfig.color, fontWeight: 600, fontSize: '0.875rem' }}>
                      {STATUS_CONFIG[order.status].label}
                    </span>
                  </td>
                  <td>
                    {getReturnStatusBadge(order)}
                    {isReturnRelated(effectiveStatus as OrderStatus) && (
                      <div className="return-subfields">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>Type:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{order.returnType || 'RVP'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          <span>Condition:</span>
                          <span style={{ color: order.returnCondition === 'Good' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            {order.returnCondition === 'Good' ? 'Sellable' : 'Damaged'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          <span>Rev Ship:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {order.returnType === 'RTO' ? '₹0' : formatCurrency(order.reverseShippingFee)}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="text-right">{getOrderProfitBadge(order)}</td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="icon-action-btn"
                      onClick={() => handleDelete(order.id)}
                      title="Delete Order"
                      style={{ width: '30px', height: '30px' }}
                    >
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  {orders.length === 0
                    ? 'No orders yet. Click "Add Order" to start tracking manually.'
                    : 'No orders match your current filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Order Modal */}
      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title="Add New Order"
      >
        {renderOrderForm(newOrder, (updates) => setNewOrder({ ...newOrder, ...updates }))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="icon-action-btn"
            onClick={() => setIsAdding(false)}
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
          <button
            className="icon-action-btn"
            onClick={handleAddSubmit}
            style={{ color: 'white', background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}
          >
            Save Order
          </button>
        </div>
      </Modal>

      {/* Edit Order Sheet */}
      <Sheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        title="Edit Order Details"
        footer={
          <>
            <button
              className="icon-action-btn"
              onClick={() => {
                if (editOrder) handleDelete(editOrder.id);
              }}
              style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', marginRight: 'auto' }}
            >
              <Trash2 size={16} style={{ marginRight: '0.5rem' }} /> Delete
            </button>
            <button
              className="icon-action-btn"
              onClick={() => setIsSheetOpen(false)}
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              className="icon-action-btn"
              onClick={handleEditSubmit}
              style={{ color: 'white', background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}
            >
              Save Changes
            </button>
          </>
        }
      >
        {editOrder && renderOrderForm(editOrder, (updates) => setEditOrder({ ...editOrder, ...updates }))}
      </Sheet>
    </div>
  );
}
