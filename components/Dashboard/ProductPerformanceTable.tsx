'use client';

import React, { ChangeEvent, useMemo, useRef } from 'react';
import {
  AlertCircle,
  Database,
  IndianRupee,
  Package,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { ProductData, ProductFeed } from '../../lib/sellerProducts';

interface ProductPerformanceTableProps {
  products: ProductData[];
  feedSource: ProductFeed['source'];
  message: string;
  costPrices: Record<string, string>;
  miscExpenses: Record<string, string>;
  isLoaded: boolean;
  isRefreshing: boolean;
  onCpChange: (sku: string, value: string) => void;
  onMiscChange: (sku: string, value: string) => void;
  onRefresh: () => Promise<void>;
  onImport: (text: string, fileName: string) => void;
}

interface ProfitRow extends ProductData {
  costPrice: number;
  miscLoss: number;
  totalCostOfGoods: number;
  actualSellerCosts: number;
  netProfit: number;
  profitMargin: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductPerformanceTable({
  products,
  feedSource,
  message,
  costPrices,
  miscExpenses,
  isLoaded,
  isRefreshing,
  onCpChange,
  onMiscChange,
  onRefresh,
  onImport,
}: ProductPerformanceTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo<ProfitRow[]>(() => {
    return products.map((product) => {
      const costPrice = parseFloat(costPrices[product.sku]) || 0;
      const miscLoss = parseFloat(miscExpenses[product.sku]) || 0;
      const totalCostOfGoods = costPrice * product.orders;
      const actualSellerCosts = totalCostOfGoods + product.settlementFees + product.returnLosses + miscLoss;
      const netProfit = product.actualRevenue - actualSellerCosts;
      const profitMargin = product.actualRevenue > 0 ? (netProfit / product.actualRevenue) * 100 : 0;

      return {
        ...product,
        costPrice,
        miscLoss,
        totalCostOfGoods,
        actualSellerCosts,
        netProfit,
        profitMargin,
      };
    });
  }, [costPrices, miscExpenses, products]);

  const totals = useMemo(() => {
    return rows.reduce(
      (summary, row) => ({
        orders: summary.orders + row.orders,
        actualRevenue: summary.actualRevenue + row.actualRevenue,
        settlementFees: summary.settlementFees + row.settlementFees,
        returnLosses: summary.returnLosses + row.returnLosses,
        miscLosses: summary.miscLosses + row.miscLoss,
        investmentCost: summary.investmentCost + row.totalCostOfGoods,
        totalFees: summary.totalFees + row.settlementFees + row.returnLosses,
        actualSellerCosts: summary.actualSellerCosts + row.actualSellerCosts,
        netProfit: summary.netProfit + row.netProfit,
      }),
      {
        orders: 0,
        actualRevenue: 0,
        settlementFees: 0,
        returnLosses: 0,
        miscLosses: 0,
        investmentCost: 0,
        totalFees: 0,
        actualSellerCosts: 0,
        netProfit: 0,
      },
    );
  }, [rows]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const text = await file.text();
    onImport(text, file.name);
  };

  if (!isLoaded) {
    return <div className="glass-panel p-6 flex-center">Loading...</div>;
  }

  const sourceLabel = feedSource === 'flipkart' ? 'Live Flipkart feed' : feedSource === 'local-import' ? 'Local report' : 'Sample data';

  return (
    <div className="glass-panel performance-table-container">
      <div className="table-header-section flex-between">
        <div>
          <h3 className="table-title">Product Profitability</h3>
          <p className="table-subtitle">Track net profit after all fees, returns, misc losses, and seller CP</p>
        </div>
        <div className="table-actions">
          <span className={`source-pill ${feedSource}`}>
            <Database size={14} />
            {sourceLabel}
          </span>
          <button className="icon-action-btn" type="button" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh products">
            <RefreshCw size={17} className={isRefreshing ? 'spin' : ''} />
          </button>
          <button className="icon-action-btn" type="button" onClick={handleImportClick} aria-label="Import seller report">
            <Upload size={17} />
          </button>
          <input ref={fileInputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={handleFileImport} />
          <div className="badge-info flex-center">
            <Package size={16} />
            <span>{rows.length} SKUs</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="status-message">
          <AlertCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      <div className="profit-summary-grid">
        <div className="summary-tile">
          <span>Orders</span>
          <strong>{formatNumber(totals.orders)}</strong>
        </div>
        <div className="summary-tile">
          <span>Revenue</span>
          <strong>{formatCurrency(totals.actualRevenue)}</strong>
        </div>
        <div className="summary-tile">
          <span>Investment (CP)</span>
          <strong>{formatCurrency(totals.investmentCost)}</strong>
        </div>
        <div className="summary-tile">
          <span>Total Fees</span>
          <strong>{formatCurrency(totals.totalFees)}</strong>
        </div>
        <div className="summary-tile">
          <span>Return Losses</span>
          <strong className="text-danger">{formatCurrency(totals.returnLosses)}</strong>
        </div>
        <div className="summary-tile">
          <span>Misc Losses</span>
          <strong className="text-danger">{formatCurrency(totals.miscLosses)}</strong>
        </div>
        <div className="summary-tile">
          <span>Total Costs</span>
          <strong>{formatCurrency(totals.actualSellerCosts)}</strong>
        </div>
        <div className={`summary-tile ${totals.netProfit >= 0 ? 'positive' : 'negative'}`}>
          <span>Real Profit / Loss</span>
          <strong>{formatCurrency(totals.netProfit)}</strong>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product &amp; SKU</th>
              <th className="text-right">Orders</th>
              <th className="text-right">Actual Revenue</th>
              <th className="text-right text-warning">Settlement Fees</th>
              <th className="text-right text-danger">Return Losses</th>
              <th className="text-right cp-column">Cost Price (CP)</th>
              <th className="text-right cp-column">Misc Losses</th>
              <th className="text-right">Total Costs</th>
              <th className="text-right">Net Profit / Loss</th>
              <th className="text-right">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => {
              const isProfitable = product.netProfit > 0;
              const isLoss = product.netProfit < 0;

              return (
                <tr key={product.sku}>
                  <td>
                    <div className="product-info">
                      <span className="product-name">{product.name}</span>
                      <span className="product-sku">{product.sku}</span>
                    </div>
                  </td>
                  <td className="text-right font-medium">{formatNumber(product.orders)}</td>
                  <td className="text-right font-medium text-info">{formatCurrency(product.actualRevenue)}</td>
                  <td className="text-right text-warning opacity-80">{formatCurrency(product.settlementFees)}</td>
                  <td className="text-right text-danger opacity-80">{formatCurrency(product.returnLosses)}</td>
                  <td className="text-right">
                    <div className="cp-input-wrapper">
                      <span className="currency-prefix">₹</span>
                      <input
                        type="text"
                        className="cp-input"
                        placeholder="0"
                        value={costPrices[product.sku] || ''}
                        onChange={(event) => onCpChange(product.sku, event.target.value)}
                      />
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="cp-input-wrapper">
                      <span className="currency-prefix">₹</span>
                      <input
                        type="text"
                        className="cp-input"
                        placeholder="0"
                        value={miscExpenses[product.sku] || ''}
                        onChange={(event) => onMiscChange(product.sku, event.target.value)}
                      />
                    </div>
                  </td>
                  <td className="text-right font-medium">{formatCurrency(product.actualSellerCosts)}</td>
                  <td className="text-right">
                    <div className={`profit-badge ${isProfitable ? 'positive' : isLoss ? 'negative' : 'neutral'}`}>
                      {isProfitable ? <TrendingUp size={16} /> : isLoss ? <TrendingDown size={16} /> : <IndianRupee size={16} />}
                      <span>{formatCurrency(product.netProfit)}</span>
                    </div>
                  </td>
                  <td className="text-right font-medium">
                    <span className={isProfitable ? 'text-success' : isLoss ? 'text-danger' : ''}>
                      {product.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
