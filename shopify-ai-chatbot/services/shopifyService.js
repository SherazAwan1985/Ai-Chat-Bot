/**
 * Shopify Service — fetches live product data from the Shopify Admin REST API.
 */

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

/**
 * Strip HTML tags from a string using a simple regex.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Fetch raw products array from Shopify Admin API.
 * @returns {Promise<Array>}
 */
async function getProductsJSON() {
  if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
    console.error('[SHOPIFY] Missing SHOPIFY_STORE or SHOPIFY_TOKEN env variables');
    return [];
  }

  const url = `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json?limit=250`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[SHOPIFY] API responded with status ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.products || [];
  } catch (err) {
    console.error('[SHOPIFY] Failed to fetch products:', err.message);
    return [];
  }
}

/**
 * Fetch products and return them as a formatted plain-text string for use in
 * the Gemini system prompt.
 * @returns {Promise<string>}
 */
async function getProductsText() {
  const products = await getProductsJSON();

  if (!products.length) {
    return 'No products available at this time.';
  }

  return products
    .map((product) => {
      const variant = product.variants && product.variants[0];
      const price = variant ? `$${variant.price}` : 'N/A';
      const stock =
        variant && variant.inventory_quantity !== undefined
          ? variant.inventory_quantity
          : 'N/A';
      const description = stripHtml(product.body_html || '').slice(0, 150);
      const tags = product.tags || '';
      const productType = product.product_type || '';

      return (
        `Product: ${product.title} | ` +
        `Price: ${price} | ` +
        `Stock: ${stock} | ` +
        `Type: ${productType} | ` +
        `Tags: ${tags} | ` +
        `Description: ${description}`
      );
    })
    .join('\n');
}

module.exports = { getProductsJSON, getProductsText };
