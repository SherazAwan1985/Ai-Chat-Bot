/**
 * POST /api/chat
 * Main chat endpoint. Fetches live Shopify products, loads custom knowledge
 * from Vercel KV, then passes everything to Gemini for a response.
 */

const { kv } = require('@vercel/kv');
const { getProductsText } = require('../services/shopifyService');
const gemini = require('../services/gemini');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Read the full request body as a string, then parse it as JSON.
 * Needed because Vercel serverless functions do not auto-parse JSON bodies.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<any>}
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const { message, history } = body;

    // ── Validate input ──────────────────────────────────────────────────────
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message is too long. Please keep it under 500 characters.' });
    }

    const conversationHistory = Array.isArray(history) ? history : [];

    console.log(`[CHAT] Message received: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`);

    // ── Gather context ──────────────────────────────────────────────────────
    const [productsText, customKnowledge] = await Promise.all([
      getProductsText(),
      kv.get('custom_knowledge').catch(() => null),
    ]);

    // ── Generate AI reply ───────────────────────────────────────────────────
    const reply = await gemini.chat(
      message.trim(),
      conversationHistory,
      productsText,
      customKnowledge || ''
    );

    console.log(`[CHAT] Reply sent: "${reply.slice(0, 80)}${reply.length > 80 ? '...' : ''}"`);

    return res.status(200).json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CHAT] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
