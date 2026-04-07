/**
 * GET /api/products
 * Returns the Shopify store's product list as a JSON array.
 * Cached at Vercel's edge for 5 minutes (s-maxage=300).
 */

const { getProductsJSON } = require('../services/shopifyService');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const products = await getProductsJSON();

    // Cache at Vercel edge for 5 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=300');

    return res.status(200).json(products);
  } catch (err) {
    console.error('[PRODUCTS] Unexpected error:', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to fetch products. Please try again.' });
  }
}
