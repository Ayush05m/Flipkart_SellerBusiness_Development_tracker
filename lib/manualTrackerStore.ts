'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type OrderStatus =
  | 'In Transit'
  | 'Delivered'
  | 'Return Period Ongoing'
  | 'Return In Transit'
  | 'Returned';

export type ReturnTypeVal = 'RVP' | 'RTO';
export type ReturnCondition = 'Good' | 'Damaged';

export interface SpfClaim {
  id: string;
  date: string;
  amount: number;
  orderId?: string;
  note: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export interface MiscCost {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface SettlementPayment {
  id: string;
  date: string;       // YYYY-MM-DD — date payment was received
  amount: number;     // ₹ amount credited by Flipkart
  note: string;       // e.g. "Week 1 June settlement", UTR number etc.
}

export interface ManualOrder {
  id: string;
  productName: string;
  orderDate: string; // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD — set when order is marked Delivered
  costPrice: number;
  sellingPrice: number;       // includes platform/shipping fees baked in
  settlementPrice: number;    // what Flipkart actually credits (SP minus GST/taxes)
  returnDurationDays: number;
  status: OrderStatus;
  returnCondition: ReturnCondition; // only meaningful when status is Returned
  returnType?: ReturnTypeVal;       // RVP (Reverse Pickup) or RTO (Return to Origin)
  reverseShippingFee: number;       // fee charged for return shipment
}

export interface TrackerMetrics {
  // Revenue & Profit
  grossRevenue: number;
  netProfit: number;
  securedProfit: number;
  atRiskProfit: number;
  returnLosses: number;           // total losses from all returns
  returnSellableLosses: number;   // losses from good returns (shipping fees only)
  returnDamagedLosses: number;    // losses from damaged returns (costPrice + shipping fees)
  investmentCost: number;         // excludes return-sellable orders (product is back)
  gstAndTaxes: number;            // sellingPrice - settlementPrice (only for non-returned orders)
  reverseShippingTotal: number;   // total reverse shipping fees across returned orders
  // Order counts
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  returnedGoodOrders: number;
  returnedDamagedOrders: number;
  inTransitOrders: number;
  returnInTransitOrders: number;
  returnPeriodOngoingOrders: number;
  securedOrders: number;
  // Percentage metrics
  profitMargin: number;
  roi: number;
  returnRate: number;
  // Chart data
  revenueTrend: Array<{ name: string; revenue: number; profit: number }>;
  feeBreakdown: Array<{ name: string; value: number }>;
  // Additional tracking
  totalSpfApprovedAmount: number;
  totalMiscCosts: number;
  // Settlement tracking
  totalSettlementDue: number;     // sum of settlementPrice for all Delivered (return-window-closed) orders
  totalSettlementReceived: number; // sum of all SettlementPayment entries
  settlementRemaining: number;    // totalSettlementDue - totalSettlementReceived
}

const STORAGE_KEY = 'flipkart_seller_manual_orders';
const SETTLEMENT_KEY = STORAGE_KEY + '_settlement_payments';

function getReturnEndDate(order: ManualOrder): number {
  // Return window is calculated from deliveryDate (when customer receives it), not orderDate
  const baseDate = order.deliveryDate || order.orderDate;
  return new Date(baseDate).getTime() + order.returnDurationDays * 24 * 60 * 60 * 1000;
}

function isReturnPeriodPassed(order: ManualOrder): boolean {
  return Date.now() > getReturnEndDate(order);
}

function getDaysLeft(order: ManualOrder): number {
  const diff = getReturnEndDate(order) - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Effective status accounts for auto-expiry of return periods.
 * - Delivered/Return Period Ongoing with expired window → Delivered (Secured)
 * - Delivered/Return Period Ongoing with active window → Return Period Ongoing (At-Risk)
 * - Everything else passes through as-is
 */
function getEffectiveStatus(order: ManualOrder): OrderStatus {
  if (order.status === 'Returned') return 'Returned';
  if (order.status === 'In Transit') return 'In Transit';
  if (order.status === 'Return In Transit') return 'Return In Transit';

  // For Delivered or Return Period Ongoing, auto-check if the window has passed
  if (order.status === 'Delivered' || order.status === 'Return Period Ongoing') {
    if (isReturnPeriodPassed(order)) {
      return 'Delivered'; // Secured — return window closed
    }
    return 'Return Period Ongoing'; // Still at risk
  }

  return order.status;
}

export function useManualTracker() {
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [spfClaims, setSpfClaims] = useState<SpfClaim[]>([]);
  const [miscCosts, setMiscCosts] = useState<MiscCost[]>([]);
  const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Migrate old orders that don't have new fields
        const parsed = JSON.parse(stored) as ManualOrder[];
        const migrated = parsed.map((o) => ({
          ...o,
          returnCondition: o.returnCondition || 'Good',
          returnType: o.returnType || 'RVP',
          reverseShippingFee: o.reverseShippingFee ?? 0,
        }));
        setOrders(migrated);
      }

      const storedSpf = localStorage.getItem(STORAGE_KEY + '_spf');
      if (storedSpf) setSpfClaims(JSON.parse(storedSpf));

      const storedMisc = localStorage.getItem(STORAGE_KEY + '_misc');
      if (storedMisc) setMiscCosts(JSON.parse(storedMisc));

      const storedSettlement = localStorage.getItem(SETTLEMENT_KEY);
      if (storedSettlement) setSettlementPayments(JSON.parse(storedSettlement));
    } catch {
      // Ignored
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      localStorage.setItem(STORAGE_KEY + '_spf', JSON.stringify(spfClaims));
      localStorage.setItem(STORAGE_KEY + '_misc', JSON.stringify(miscCosts));
      localStorage.setItem(SETTLEMENT_KEY, JSON.stringify(settlementPayments));
    }
  }, [orders, spfClaims, miscCosts, settlementPayments, isLoaded]);

  const addOrder = useCallback((order: Omit<ManualOrder, 'id'>) => {
    const newOrder: ManualOrder = {
      ...order,
      id: `mt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setOrders((prev) => [newOrder, ...prev]);
  }, []);

  const updateOrder = useCallback((id: string, updates: Partial<ManualOrder>) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === id) {
          const updated = { ...order, ...updates };
          // When switching away from Returned, reset return-specific fields
          if (updates.status && updates.status !== 'Returned' && updates.status !== 'Return In Transit') {
            updated.returnCondition = 'Good';
            updated.returnType = 'RVP';
            updated.reverseShippingFee = 0;
          }
          // If switching to RTO, force reverse shipping fee to 0
          if (updated.returnType === 'RTO') {
            updated.reverseShippingFee = 0;
          }
          return updated;
        }
        return order;
      })
    );
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== id));
  }, []);

  const importOrders = useCallback((imported: ManualOrder[]) => {
    setOrders((prev) => {
      // Create a map of existing orders for quick lookup
      const existingMap = new Map(prev.map((o) => [o.id, o]));
      
      // Override or add imported ones
      imported.forEach((o) => existingMap.set(o.id, o));
      
      // Convert map back to array, sort by date descending
      return Array.from(existingMap.values()).sort(
        (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      );
    });
  }, []);

  const importData = useCallback((payload: { orders?: ManualOrder[], spfClaims?: SpfClaim[], miscCosts?: MiscCost[], settlementPayments?: SettlementPayment[] }) => {
    if (payload.orders && payload.orders.length > 0) {
      importOrders(payload.orders);
    }
    if (payload.spfClaims && payload.spfClaims.length > 0) {
      setSpfClaims((prev) => {
        const existingMap = new Map(prev.map((c) => [c.id, c]));
        payload.spfClaims!.forEach((c) => existingMap.set(c.id, c));
        return Array.from(existingMap.values());
      });
    }
    if (payload.miscCosts && payload.miscCosts.length > 0) {
      setMiscCosts((prev) => {
        const existingMap = new Map(prev.map((c) => [c.id, c]));
        payload.miscCosts!.forEach((c) => existingMap.set(c.id, c));
        return Array.from(existingMap.values());
      });
    }
    if (payload.settlementPayments && payload.settlementPayments.length > 0) {
      setSettlementPayments((prev) => {
        const existingMap = new Map(prev.map((c) => [c.id, c]));
        payload.settlementPayments!.forEach((c) => existingMap.set(c.id, c));
        return Array.from(existingMap.values());
      });
    }
  }, [importOrders]);

  const addSpfClaim = useCallback((claim: Omit<SpfClaim, 'id'>) => {
    setSpfClaims((prev) => [{ ...claim, id: `spf_${Date.now()}` }, ...prev]);
  }, []);

  const deleteSpfClaim = useCallback((id: string) => {
    setSpfClaims((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addMiscCost = useCallback((cost: Omit<MiscCost, 'id'>) => {
    setMiscCosts((prev) => [{ ...cost, id: `misc_${Date.now()}` }, ...prev]);
  }, []);

  const deleteMiscCost = useCallback((id: string) => {
    setMiscCosts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addSettlementPayment = useCallback((payment: Omit<SettlementPayment, 'id'>) => {
    setSettlementPayments((prev) => [{ ...payment, id: `sett_${Date.now()}` }, ...prev]);
  }, []);

  const deleteSettlementPayment = useCallback((id: string) => {
    setSettlementPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const metrics = useMemo<TrackerMetrics>(() => {
    // Pre-compute totalSettlementDue from all secured (Delivered, return-window-passed) orders
    let totalSettlementDue = 0;
    let grossRevenue = 0;
    let securedProfit = 0;
    let atRiskProfit = 0;
    let returnLosses = 0;
    let returnSellableLosses = 0;
    let returnDamagedLosses = 0;
    let investmentCost = 0;
    let gstAndTaxes = 0;
    let reverseShippingTotal = 0;
    let deliveredOrders = 0;
    let returnedOrders = 0;
    let returnedGoodOrders = 0;
    let returnedDamagedOrders = 0;
    let inTransitOrders = 0;
    let returnInTransitOrders = 0;
    let returnPeriodOngoingOrders = 0;
    let securedOrders = 0;

    let totalSpfApprovedAmount = 0;
    let totalMiscCosts = 0;
    let totalSettlementReceived = 0;

    spfClaims.forEach((c) => {
      if (c.status === 'Approved') totalSpfApprovedAmount += c.amount;
    });

    miscCosts.forEach((c) => {
      totalMiscCosts += c.amount;
    });

    settlementPayments.forEach((p) => {
      totalSettlementReceived += p.amount;
    });

    // For charting — group by order date
    const dateMap = new Map<string, { revenue: number; profit: number }>();

    orders.forEach((order) => {
      const effectiveStatus = getEffectiveStatus(order);
      const taxDeduction = Math.max(0, order.sellingPrice - order.settlementPrice);

      if (effectiveStatus === 'Returned') {
        returnedOrders++;
        
        // RTO has no reverse shipping fee
        const effectiveReverseFee = order.returnType === 'RTO' ? 0 : order.reverseShippingFee;
        
        reverseShippingTotal += effectiveReverseFee;

        if (order.returnCondition === 'Good') {
          // ── Return Sellable ─────────────────────────────────
          // Product came back in sellable condition.
          // • NO revenue, NO GST, NO investment cost (product is back with seller)
          // • Only losses = reverse shipping fee
          returnedGoodOrders++;
          const goodLoss = effectiveReverseFee;
          returnSellableLosses += goodLoss;
          returnLosses += goodLoss;
        } else {
          // ── Return Damaged ─────────────────────────────────
          // Product came back damaged/used — not sellable.
          // • NO revenue, NO GST
          // • Investment cost IS counted (cost price is a real loss)
          // • Losses = settlementPrice + reverse shipping fee
          returnedDamagedOrders++;
          investmentCost += order.costPrice;
          const damagedLoss = order.settlementPrice + effectiveReverseFee;
          returnDamagedLosses += damagedLoss;
          returnLosses += damagedLoss;
        }

        // No GST/taxes or revenue for returned orders — sale is effectively cancelled

      } else if (effectiveStatus === 'Delivered') {
        // Return period passed — fully secured
        deliveredOrders++;
        securedOrders++;
        investmentCost += order.costPrice;
        grossRevenue += order.sellingPrice;
        gstAndTaxes += taxDeduction;
        totalSettlementDue += order.settlementPrice; // Flipkart owes this to seller
        const profit = order.settlementPrice - order.costPrice;
        securedProfit += profit;

        const existing = dateMap.get(order.orderDate) || { revenue: 0, profit: 0 };
        existing.revenue += order.sellingPrice;
        existing.profit += profit;
        dateMap.set(order.orderDate, existing);

      } else if (effectiveStatus === 'Return Period Ongoing') {
        // Delivered but return window still open — at risk
        returnPeriodOngoingOrders++;
        investmentCost += order.costPrice;
        grossRevenue += order.sellingPrice;
        gstAndTaxes += taxDeduction;
        const profit = order.settlementPrice - order.costPrice;
        atRiskProfit += profit;

        const existing = dateMap.get(order.orderDate) || { revenue: 0, profit: 0 };
        existing.revenue += order.sellingPrice;
        existing.profit += profit;
        dateMap.set(order.orderDate, existing);

      } else if (effectiveStatus === 'In Transit') {
        inTransitOrders++;
        investmentCost += order.costPrice;
        grossRevenue += order.sellingPrice;
        gstAndTaxes += taxDeduction;
        // Expected but not yet realized
        const expectedProfit = order.settlementPrice ? order.settlementPrice - order.costPrice : 0;
        atRiskProfit += expectedProfit;

      } else if (effectiveStatus === 'Return In Transit') {
        returnInTransitOrders++;
        
        // RTO has no reverse shipping fee
        const effectiveReverseFee = order.returnType === 'RTO' ? 0 : order.reverseShippingFee;
        reverseShippingTotal += effectiveReverseFee;
        
        const pendingLoss = effectiveReverseFee;
        returnLosses += pendingLoss;
      }
    });

    const netProfit = securedProfit + atRiskProfit - returnLosses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const roi = investmentCost > 0 ? (netProfit / investmentCost) * 100 : 0;
    const totalFulfilledOrders = deliveredOrders + returnedOrders + returnPeriodOngoingOrders;
    const returnRate = totalFulfilledOrders > 0 ? (returnedOrders / totalFulfilledOrders) * 100 : 0;

    // Build revenue trend data (daily basis)
    const revenueTrend = Array.from(dateMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-14) // Limit to last 14 days of data to keep graph readable
      .map(([name, data]) => {
        const dateObj = new Date(name);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          name: formattedDate,
          revenue: data.revenue,
          profit: data.profit,
        };
      });

    // Build fee breakdown
    const feeBreakdown = [
      { name: 'GST & Taxes', value: gstAndTaxes },
      { name: 'Ret. Sellable Loss', value: returnSellableLosses },
      { name: 'Ret. Damaged Loss', value: returnDamagedLosses },
      { name: 'Investment (CP)', value: investmentCost },
      { name: 'Secured Profit', value: Math.max(securedProfit, 0) },
      { name: 'At-Risk Profit', value: Math.max(atRiskProfit, 0) },
    ];

    const settlementRemaining = totalSettlementDue - totalSettlementReceived;

    return {
      grossRevenue,
      netProfit,
      securedProfit,
      atRiskProfit,
      returnLosses,
      returnSellableLosses,
      returnDamagedLosses,
      investmentCost,
      gstAndTaxes,
      reverseShippingTotal,
      totalOrders: orders.length,
      deliveredOrders,
      returnedOrders,
      returnedGoodOrders,
      returnedDamagedOrders,
      inTransitOrders,
      returnInTransitOrders,
      returnPeriodOngoingOrders,
      securedOrders,
      profitMargin,
      roi,
      returnRate,
      revenueTrend: revenueTrend.length ? revenueTrend : [{ name: 'No data', revenue: 0, profit: 0 }],
      feeBreakdown,
      totalSpfApprovedAmount,
      totalMiscCosts,
      totalSettlementDue,
      totalSettlementReceived,
      settlementRemaining,
    };
  }, [orders, spfClaims, miscCosts, settlementPayments]);

  return {
    orders,
    spfClaims,
    miscCosts,
    settlementPayments,
    isLoaded,
    metrics,
    addOrder,
    updateOrder,
    deleteOrder,
    importOrders,
    importData,
    addSpfClaim,
    deleteSpfClaim,
    addMiscCost,
    deleteMiscCost,
    addSettlementPayment,
    deleteSettlementPayment,
    getEffectiveStatus: (order: ManualOrder) => getEffectiveStatus(order),
    getDaysLeft: (order: ManualOrder) => getDaysLeft(order),
    isReturnPeriodPassed: (order: ManualOrder) => isReturnPeriodPassed(order),
  };
}
