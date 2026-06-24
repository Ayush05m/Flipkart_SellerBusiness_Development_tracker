import { NextResponse } from 'next/server';
import { normalizeSellerProducts, sampleProducts } from '../../../../lib/sellerProducts';

export const dynamic = 'force-dynamic';

const DEFAULT_TOKEN_URL = 'https://api.flipkart.net/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_Api';

let cachedToken: string | null = null;
let tokenExpirationTime: number | null = null;

async function getAccessToken() {
  const token = process.env.FLIPKART_SELLER_ACCESS_TOKEN;
  const clientId = process.env.FLIPKART_SELLER_CLIENT_ID;
  const clientSecret = process.env.FLIPKART_SELLER_CLIENT_SECRET;

  // 1. Use the manual override token if provided in .env
  if (token) {
    return token;
  }

  // 2. Use the in-memory cached token if it exists and hasn't expired
  if (cachedToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
    return cachedToken;
  }

  if (!clientId || !clientSecret) {
    return '';
  }

  // 3. Generate a new token
  const response = await fetch(process.env.FLIPKART_SELLER_TOKEN_URL || DEFAULT_TOKEN_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Flipkart auth returned ${response.status}`);
  }

  const payload = await response.json() as { access_token?: unknown, expires_in?: number };
  
  if (typeof payload.access_token === 'string') {
    cachedToken = payload.access_token;
    
    // Most OAuth tokens provide an `expires_in` (in seconds). 
    // We default to 1 hour (3600s) if not provided, and subtract 5 minutes (300s) as a safety buffer.
    const expiresIn = payload.expires_in || 3600;
    tokenExpirationTime = Date.now() + (expiresIn - 300) * 1000;
    
    return cachedToken;
  }
  
  return '';
}

async function buildHeaders() {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const clientId = process.env.FLIPKART_SELLER_CLIENT_ID;
  const clientSecret = process.env.FLIPKART_SELLER_CLIENT_SECRET;
  const token = await getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (clientId) {
    headers['X-Client-Id'] = clientId;
  }

  if (clientSecret) {
    headers['X-Client-Secret'] = clientSecret;
  }

  return headers;
}

export async function GET() {
  const clientId = process.env.FLIPKART_SELLER_CLIENT_ID;
  const clientSecret = process.env.FLIPKART_SELLER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      source: 'sample',
      products: sampleProducts,
      message: 'Set FLIPKART_SELLER_CLIENT_ID and FLIPKART_SELLER_CLIENT_SECRET in .env to fetch live data.',
    });
  }

  try {
    const headers = await buildHeaders();
    headers['Content-Type'] = 'application/json';

    const toDate = new Date().toISOString();
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

    const payload = {
      filter: {
        orderDate: { fromDate, toDate },
      },
      pagination: { pageSize: 50 },
    };

    // Fetch Orders
    const ordersResponse = await fetch('https://api.flipkart.net/sellers/v3/orders/search', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    // Fetch Returns
    const returnsResponse = await fetch('https://api.flipkart.net/sellers/v2/returns/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter: { returnDate: { fromDate, toDate } }, pagination: { pageSize: 50 } }),
      cache: 'no-store',
    });

    if (!ordersResponse.ok && !returnsResponse.ok) {
      return NextResponse.json(
        {
          source: 'sample',
          products: sampleProducts,
          message: `Flipkart API returned errors (Orders: ${ordersResponse.status}, Returns: ${returnsResponse.status}). Showing sample data.`,
        },
        { status: 200 },
      );
    }

    const ordersData = ordersResponse.ok ? await ordersResponse.json() : { orderItems: [] };
    const returnsData = returnsResponse.ok ? await returnsResponse.json() : { returnItems: [] };

    // Aggregate by SKU
    const skuMap: Record<string, any> = {};

    const orderItems = ordersData.orderItems || [];
    for (const item of orderItems) {
      const sku = item.sku;
      if (!skuMap[sku]) {
        skuMap[sku] = {
          sku,
          name: item.title || sku,
          orders: 0,
          actualRevenue: 0,
          settlementFees: 0, // Estimated or extracted
          returnLosses: 0,
        };
      }
      skuMap[sku].orders += item.quantity || 1;
      
      const sellingPrice = item.priceComponents?.sellingPrice || 0;
      const shippingCharge = item.priceComponents?.shippingCharge || 0;
      const totalCustomerPrice = item.priceComponents?.totalPrice || (sellingPrice + shippingCharge);
      
      skuMap[sku].actualRevenue += totalCustomerPrice;
      
      // Estimate fees if not directly provided (approx 15% commission + shipping + 18% GST)
      const estimatedCommission = sellingPrice * 0.15;
      const estimatedShippingFee = 50; 
      const estimatedGst = (estimatedCommission + estimatedShippingFee) * 0.18;
      skuMap[sku].settlementFees += estimatedCommission + estimatedShippingFee + estimatedGst;
    }

    const returnItems = returnsData.returnItems || [];
    for (const ret of returnItems) {
      const sku = ret.sku || ret.orderItemId; // fallback if sku is not at root
      if (skuMap[sku]) {
        // Estimate return losses (forward + reverse shipping)
        skuMap[sku].returnLosses += 150; 
      }
    }

    const products = Object.values(skuMap);

    if (!products.length) {
      return NextResponse.json({
        source: 'sample',
        products: sampleProducts,
        message: 'Flipkart API responded, but no orders were found for the last 30 days.',
      });
    }

    return NextResponse.json({
      source: 'flipkart',
      products,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Flipkart fetch error';

    return NextResponse.json({
      source: 'sample',
      products: sampleProducts,
      message: `Could not fetch Flipkart APIs: ${message}`,
    });
  }
}
