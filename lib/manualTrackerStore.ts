'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type OrderStatus =
  | 'In Transit'
  | 'Delivered'
  | 'Return Period Ongoing'
  | 'Return In Transit'
  | 'Returned';

export type ReturnCondition = 'Good' | 'Damaged';

export interface ManualOrder {
  id: string;
  productName: string;
  orderDate: string; // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD — set when order is marked Delivered
  costPrice: number;
  sellingPrice: number;       // includes platform/shipping fees baked in
  settlementPrice: number;    // what Flipkart actually credits (SP minus GST/taxes)
  shippingFee: number;            // forward shipping fee paid to ship to customer
  returnDurationDays: number;
  status: OrderStatus;
  returnCondition: ReturnCondition; // only meaningful when status is Returned
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
  forwardShippingTotal: number;   // total forward shipping fees across all orders
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
}

const STORAGE_KEY = 'flipkart_seller_manual_orders';

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Migrate old orders that don't have new fields
        const parsed = JSON.parse(stored) as ManualOrder[];
        const migrated = parsed.map((o) => ({
          ...o,
          shippingFee: o.shippingFee ?? 0,
          returnCondition: o.returnCondition || 'Good',
          reverseShippingFee: o.reverseShippingFee ?? 0,
        }));
        setOrders(migrated);
      }
    } catch {
      // Ignored
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders, isLoaded]);

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

  const metrics = useMemo<TrackerMetrics>(() => {
    let grossRevenue = 0;
    let securedProfit = 0;
    let atRiskProfit = 0;
    let returnLosses = 0;
    let returnSellableLosses = 0;
    let returnDamagedLosses = 0;
    let investmentCost = 0;
    let gstAndTaxes = 0;
    let forwardShippingTotal = 0;
    let reverseShippingTotal = 0;
    let deliveredOrders = 0;
    let returnedOrders = 0;
    let returnedGoodOrders = 0;
    let returnedDamagedOrders = 0;
    let inTransitOrders = 0;
    let returnInTransitOrders = 0;
    let returnPeriodOngoingOrders = 0;
    let securedOrders = 0;

    // For charting — group by product name
    const productMap = new Map<string, { revenue: number; profit: number }>();

    orders.forEach((order) => {
      const effectiveStatus = getEffectiveStatus(order);
      const taxDeduction = Math.max(0, order.sellingPrice - order.settlementPrice);

      if (effectiveStatus === 'Returned') {
        returnedOrders++;
        reverseShippingTotal += order.reverseShippingFee;
        forwardShippingTotal += order.shippingFee;

        if (order.returnCondition === 'Good') {
          // ── Return Sellable ─────────────────────────────────
          // Product came back in sellable condition.
          // • NO revenue, NO GST, NO investment cost (product is back with seller)
          // • Only losses = forward shipping fee + reverse shipping fee
          returnedGoodOrders++;
          const goodLoss = order.shippingFee + order.reverseShippingFee;
          returnSellableLosses += goodLoss;
          returnLosses += goodLoss;
        } else {
          // ── Return Damaged ─────────────────────────────────
          // Product came back damaged/used — not sellable.
          // • NO revenue, NO GST
          // • Investment cost IS counted (cost price is a real loss)
          // • Losses = costPrice + forward shipping fee + reverse shipping fee
          returnedDamagedOrders++;
          investmentCost += order.costPrice;
          const damagedLoss = order.costPrice + order.shippingFee + order.reverseShippingFee;
          returnDamagedLosses += damagedLoss;
          returnLosses += damagedLoss;
        }

        // No GST/taxes or revenue for returned orders — sale is effectively cancelled

      } else if (effectiveStatus === 'Delivered') {
        // Return period passed — fully secured
        deliveredOrders++;
        securedOrders++;
        investmentCost += order.costPrice;
        forwardShippingTotal += order.shippingFee;
        grossRevenue += order.sellingPrice;
        gstAndTaxes += taxDeduction;
        const profit = order.settlementPrice - order.costPrice;
        securedProfit += profit;

        const existing = productMap.get(order.productName) || { revenue: 0, profit: 0 };
        existing.revenue += order.sellingPrice;
        existing.profit += profit;
        productMap.set(order.productName, existing);

      } else if (effectiveStatus === 'Return Period Ongoing') {
        // Delivered but return window still open — at risk
        returnPeriodOngoingOrders++;
        investmentCost += order.costPrice;
        forwardShippingTotal += order.shippingFee;
        grossRevenue += order.sellingPrice;
        gstAndTaxes += taxDeduction;
        const profit = order.settlementPrice - order.costPrice;
        atRiskProfit += profit;

        const existing = productMap.get(order.productName) || { revenue: 0, profit: 0 };
        existing.revenue += order.sellingPrice;
        existing.profit += profit;
        productMap.set(order.productName, existing);

      } else if (effectiveStatus === 'In Transit') {
        inTransitOrders++;
        investmentCost += order.costPrice;
        forwardShippingTotal += order.shippingFee;
        gstAndTaxes += taxDeduction;
        // Expected but not yet realized
        const expectedProfit = order.settlementPrice ? order.settlementPrice - order.costPrice : 0;
        atRiskProfit += expectedProfit;

      } else if (effectiveStatus === 'Return In Transit') {
        returnInTransitOrders++;
        forwardShippingTotal += order.shippingFee;
        // Don't add GST — return is in progress, sale may be cancelled
        // Don't add to investmentCost yet — depends on return condition
        // Return is in progress — we don't know condition yet
        // Treat as potential loss (at minimum shipping fees)
        reverseShippingTotal += order.reverseShippingFee;
        const pendingLoss = order.shippingFee + order.reverseShippingFee;
        returnLosses += pendingLoss;
      }
    });

    const netProfit = securedProfit + atRiskProfit - returnLosses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const roi = investmentCost > 0 ? (netProfit / investmentCost) * 100 : 0;
    const totalFulfilledOrders = deliveredOrders + returnedOrders + returnPeriodOngoingOrders;
    const returnRate = totalFulfilledOrders > 0 ? (returnedOrders / totalFulfilledOrders) * 100 : 0;

    // Build revenue trend data (top products by revenue)
    const revenueTrend = Array.from(productMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 8)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '…' : name,
        revenue: data.revenue,
        profit: data.profit,
      }));

    // Build fee breakdown
    const feeBreakdown = [
      { name: 'GST & Taxes', value: gstAndTaxes },
      { name: 'Fwd Shipping', value: forwardShippingTotal },
      { name: 'Ret. Sellable Loss', value: returnSellableLosses },
      { name: 'Ret. Damaged Loss', value: returnDamagedLosses },
      { name: 'Investment (CP)', value: investmentCost },
      { name: 'Secured Profit', value: Math.max(securedProfit, 0) },
      { name: 'At-Risk Profit', value: Math.max(atRiskProfit, 0) },
    ];

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
      forwardShippingTotal,
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
    };
  }, [orders]);

  return {
    orders,
    isLoaded,
    metrics,
    addOrder,
    updateOrder,
    deleteOrder,
    importOrders,
    getEffectiveStatus: (order: ManualOrder) => getEffectiveStatus(order),
    getDaysLeft: (order: ManualOrder) => getDaysLeft(order),
    isReturnPeriodPassed: (order: ManualOrder) => isReturnPeriodPassed(order),
  };
}
