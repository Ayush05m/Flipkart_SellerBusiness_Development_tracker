import * as fs from 'fs';

const text = fs.readFileSync('./flipkart-orders-2026-06-21.json', 'utf8');
const parsed = JSON.parse(text);

const imported = parsed
  .filter((row: any) => row && typeof row === 'object' && row.productName)
  .map((row: any) => ({
    id: row.id || `mt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productName: String(row.productName || ''),
    orderDate: String(row.orderDate || new Date().toISOString().split('T')[0]),
    costPrice: Number(row.costPrice) || 0,
    sellingPrice: Number(row.sellingPrice) || 0,
    settlementPrice: Number(row.settlementPrice ?? row.settlementAmount) || 0,
    returnDurationDays: Number(row.returnDurationDays) || 10,
    status: row.status,
    returnCondition: row.returnCondition,
    reverseShippingFee: Number(row.reverseShippingFee) || 0,
  }));

console.log(imported);
