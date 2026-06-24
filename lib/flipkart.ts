'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildDashboardData,
  DashboardData,
  normalizeSellerProducts,
  ProductData,
  ProductFeed,
  sampleProducts,
} from './sellerProducts';

const IMPORT_STORAGE_KEY = 'flipkart_seller_imported_products';
const CP_STORAGE_KEY = 'flipkart_seller_cp_data';
const MISC_STORAGE_KEY = 'flipkart_seller_misc_expenses';

export type FlipkartDashboardData = DashboardData;

export interface FlipkartDashboardState {
  dashboardData: FlipkartDashboardData;
  products: ProductData[];
  feedSource: ProductFeed['source'];
  message: string;
  costPrices: Record<string, string>;
  miscExpenses: Record<string, string>;
  isLoaded: boolean;
  isRefreshing: boolean;
  handleCpChange: (sku: string, value: string) => void;
  handleMiscChange: (sku: string, value: string) => void;
  loadProducts: () => Promise<void>;
  handleImport: (text: string, fileName: string) => void;
}

function loadFromStorage(key: string): Record<string, string> {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    localStorage.removeItem(key);
    return {};
  }
}

export function useFlipkartDashboard(): FlipkartDashboardState {
  const [products, setProducts] = useState<ProductData[]>(sampleProducts);
  const [feedSource, setFeedSource] = useState<ProductFeed['source']>('sample');
  const [message, setMessage] = useState('');
  const [costPrices, setCostPrices] = useState<Record<string, string>>({});
  const [miscExpenses, setMiscExpenses] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load persisted cost prices and misc expenses from localStorage on mount
  useEffect(() => {
    setCostPrices(loadFromStorage(CP_STORAGE_KEY));
    setMiscExpenses(loadFromStorage(MISC_STORAGE_KEY));
    setIsLoaded(true);
  }, []);

  // Persist cost prices
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CP_STORAGE_KEY, JSON.stringify(costPrices));
    }
  }, [costPrices, isLoaded]);

  // Persist misc expenses
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(MISC_STORAGE_KEY, JSON.stringify(miscExpenses));
    }
  }, [miscExpenses, isLoaded]);

  const loadProducts = useCallback(async () => {
    setIsRefreshing(true);
    setMessage('');

    try {
      const response = await fetch('/api/flipkart/products', { cache: 'no-store' });
      const feed = await response.json() as ProductFeed;

      if (feed.products?.length) {
        setProducts(feed.products);
        setFeedSource(feed.source);
        setMessage(feed.message ?? '');
        return;
      }

      setProducts(sampleProducts);
      setFeedSource('sample');
      setMessage('No rows were returned. Showing sample data.');
    } catch (error) {
      const storedImport = localStorage.getItem(IMPORT_STORAGE_KEY);

      if (storedImport) {
        try {
          const importedProducts = normalizeSellerProducts(JSON.parse(storedImport));
          if (importedProducts.length) {
            setProducts(importedProducts);
            setFeedSource('local-import');
            setMessage('Using your last imported report.');
            return;
          }
        } catch {
          localStorage.removeItem(IMPORT_STORAGE_KEY);
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unable to load product data';
      setProducts(sampleProducts);
      setFeedSource('sample');
      setMessage(`${errorMessage}. Showing sample data.`);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCpChange = useCallback((sku: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCostPrices((prev) => ({ ...prev, [sku]: value }));
    }
  }, []);

  const handleMiscChange = useCallback((sku: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMiscExpenses((prev) => ({ ...prev, [sku]: value }));
    }
  }, []);

  const handleImport = useCallback((text: string, fileName: string) => {
    try {
      const parsed = JSON.parse(text);
      const importedProducts = normalizeSellerProducts(parsed);

      if (!importedProducts.length) {
        setMessage('Imported file did not contain readable product rows.');
        return;
      }

      localStorage.setItem(IMPORT_STORAGE_KEY, text);
      setProducts(importedProducts);
      setFeedSource('local-import');
      setMessage(`${importedProducts.length} rows imported from ${fileName}.`);
    } catch {
      setMessage('Import failed. Use a JSON report with SKU, orders, revenue, fees, and returns fields.');
    }
  }, []);

  // Build dashboard data reactively whenever products, costPrices, or miscExpenses change
  const dashboardData = useMemo(
    () => buildDashboardData(products, costPrices, miscExpenses),
    [products, costPrices, miscExpenses],
  );

  return {
    dashboardData,
    products,
    feedSource,
    message,
    costPrices,
    miscExpenses,
    isLoaded,
    isRefreshing,
    handleCpChange,
    handleMiscChange,
    loadProducts,
    handleImport,
  };
}

// Keep backward compat export
export function useFlipkartDashboardData() {
  const { dashboardData } = useFlipkartDashboard();
  return dashboardData;
}
