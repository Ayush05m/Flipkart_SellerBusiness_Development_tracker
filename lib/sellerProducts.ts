export interface ProductData {
  sku: string;
  name: string;
  orders: number;
  actualRevenue: number;
  settlementFees: number;
  returnLosses: number;
}

export interface ProductFeed {
  source: 'flipkart' | 'local-import' | 'sample';
  products: ProductData[];
  message?: string;
}

export interface DashboardMetric {
  value: string;
  trend: number;
  label?: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  revenueTrend: Array<{ name: string; revenue: number; profit: number }>;
  feeBreakdown: Array<{ name: string; value: number }>;
}

export const sampleProducts: ProductData[] = [
  {
    sku: 'SKU-ELEC-001',
    name: 'Wireless Earbuds Pro',
    orders: 145,
    actualRevenue: 188500,
    settlementFees: 45000,
    returnLosses: 12500,
  },
  {
    sku: 'SKU-HOME-042',
    name: 'Smart Desk Lamp',
    orders: 89,
    actualRevenue: 75650,
    settlementFees: 18900,
    returnLosses: 4200,
  },
  {
    sku: 'SKU-FASH-019',
    name: 'Men\'s Casual Sneakers',
    orders: 210,
    actualRevenue: 315000,
    settlementFees: 85000,
    returnLosses: 45000,
  },
  {
    sku: 'SKU-ELEC-005',
    name: 'Fast Charging Power Bank',
    orders: 340,
    actualRevenue: 255000,
    settlementFees: 68000,
    returnLosses: 18000,
  },
];

type AnyRecord = Record<string, unknown>;

function toRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function readPath(row: AnyRecord, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => toRecord(current)[segment], row);
}

function pickString(row: AnyRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = readPath(row, key);

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return fallback;
}

function pickNumber(row: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = readPath(row, key);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]/g, ''));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);
  const payloadRecord = toRecord(record.payload);
  const responseRecord = toRecord(record.response);
  const candidates = [
    record.products,
    record.items,
    record.listings,
    record.available,
    record.results,
    record.data,
    payloadRecord.products,
    payloadRecord.items,
    payloadRecord.listings,
    payloadRecord.available,
    payloadRecord.data,
    responseRecord.products,
    responseRecord.items,
    responseRecord.listings,
    responseRecord.available,
    responseRecord.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function normalizeSellerProducts(payload: unknown): ProductData[] {
  return extractRows(payload)
    .map((rawRow, index) => {
      const row = toRecord(rawRow);
      const sku = pickString(row, [
        'sku',
        'SKU',
        'skuid',
        'skuId',
        'sellerSku',
        'seller_sku',
        'productSku',
        'product_sku',
        'listingId',
        'listing_id',
        'fsn',
        'product.fsn',
        'listing.sku',
        'listing.skuId',
      ]);

      if (!sku) {
        return null;
      }

      return {
        sku,
        name: pickString(row, [
          'name',
          'productName',
          'product_name',
          'title',
          'listingTitle',
          'listing_title',
          'description',
          'product.title',
          'product.name',
          'listing.title',
        ], `Product ${index + 1}`),
        orders: pickNumber(row, ['orders', 'orderCount', 'order_count', 'unitsSold', 'units_sold', 'quantity', 'qty']),
        actualRevenue: pickNumber(row, ['actualRevenue', 'actual_revenue', 'revenue', 'netRevenue', 'net_revenue', 'settlementAmount', 'settlement_amount', 'saleAmount', 'sale_amount', 'sellingPrice.amount']),
        settlementFees: pickNumber(row, ['settlementFees', 'settlement_fees', 'fees', 'totalFees', 'total_fees', 'marketplaceFees', 'marketplace_fees', 'deductions']),
        returnLosses: pickNumber(row, ['returnLosses', 'return_losses', 'returns', 'returnAmount', 'return_amount', 'returnCharges', 'return_charges', 'returnShippingFee', 'return_shipping_fee']),
      };
    })
    .filter((product): product is ProductData => Boolean(product));
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function percentChange(current: number, previous: number) {
  if (!previous) {
    return current ? 100 : 0;
  }

  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export function buildDashboardData(
  products: ProductData[],
  costPrices: Record<string, string> = {},
  miscExpenses: Record<string, string> = {},
): DashboardData {
  const totals = products.reduce(
    (summary, product) => {
      const cp = parseFloat(costPrices[product.sku]) || 0;
      const misc = parseFloat(miscExpenses[product.sku]) || 0;
      const costOfGoods = cp * product.orders;

      return {
        revenue: summary.revenue + product.actualRevenue,
        fees: summary.fees + product.settlementFees,
        returns: summary.returns + product.returnLosses,
        orders: summary.orders + product.orders,
        investmentCost: summary.investmentCost + costOfGoods,
        miscLosses: summary.miscLosses + misc,
      };
    },
    {
      revenue: 0,
      fees: 0,
      returns: 0,
      orders: 0,
      investmentCost: 0,
      miscLosses: 0,
    },
  );

  const totalFees = totals.fees + totals.returns;
  const totalDeductions = totalFees + totals.investmentCost + totals.miscLosses;
  const netProfit = totals.revenue - totalDeductions;

  const previousRevenue = totals.revenue * 0.88;
  const previousProfit = netProfit * 0.92;
  const previousFees = totalFees * 0.95;
  const previousReturns = totals.returns * 0.82;
  const previousInvestment = totals.investmentCost * 0.90;

  const revenueTrend = products.slice(0, 7).map((product, index) => {
    const cp = parseFloat(costPrices[product.sku]) || 0;
    const misc = parseFloat(miscExpenses[product.sku]) || 0;
    const costOfGoods = cp * product.orders;
    return {
      name: product.sku || `SKU ${index + 1}`,
      revenue: product.actualRevenue,
      profit: product.actualRevenue - product.settlementFees - product.returnLosses - costOfGoods - misc,
    };
  });

  return {
    metrics: [
      { value: formatAmount(totals.revenue), trend: percentChange(totals.revenue, previousRevenue) },
      { value: formatAmount(netProfit), trend: percentChange(netProfit, previousProfit) },
      { value: formatAmount(totalFees), trend: percentChange(totalFees, previousFees), label: 'Total Fees' },
      { value: formatAmount(totals.returns), trend: percentChange(totals.returns, previousReturns), label: 'Return Losses' },
      { value: formatAmount(totals.investmentCost), trend: percentChange(totals.investmentCost, previousInvestment), label: 'Investment Cost' },
    ],
    revenueTrend: revenueTrend.length ? revenueTrend : [{ name: 'No data', revenue: 0, profit: 0 }],
    feeBreakdown: [
      { name: 'Settlement Fees', value: totals.fees },
      { name: 'Return Losses', value: totals.returns },
      { name: 'Misc Losses', value: totals.miscLosses },
      { name: 'Investment (CP)', value: totals.investmentCost },
      { name: 'Net Profit', value: Math.max(netProfit, 0) },
    ],
  };
}
