# Flipkart Seller Analytics - Next.js

Seller profitability dashboard for Flipkart seller data.

## Setup

1. Open a terminal in `next-app`
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Flipkart seller values
4. Run `npm run dev`

## Flipkart data

The app fetches products through the server route at `/api/flipkart/products`, so Flipkart credentials stay out of the browser.

Create `.env.local` from `.env.example`:

```bash
FLIPKART_SELLER_PRODUCTS_URL=https://api.flipkart.net/your-seller-report-or-listings-endpoint
FLIPKART_SELLER_CLIENT_ID=your_client_id
FLIPKART_SELLER_CLIENT_SECRET=your_client_secret
```

You can also provide `FLIPKART_SELLER_ACCESS_TOKEN` instead of client credentials.

The endpoint response can be a plain array or an object containing `products`, `items`, `listings`, `data`, or `results`. Rows are normalized from common seller fields such as `sku`, `sellerSku`, `listingId`, `fsn`, `orders`, `actualRevenue`, `settlementFees`, and `returnLosses`.

If the Flipkart endpoint or credentials are missing, the UI clearly falls back to sample data. You can also import a JSON seller report from the product table.
