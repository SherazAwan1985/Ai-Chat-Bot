/**
 * POST /api/chat
 * Main chat endpoint. Fetches live Shopify products, loads custom knowledge
 * from Vercel Blob, then passes everything to Gemini for a response.
 */

const { list } = require('@vercel/blob');
const { getProductsText } = require('../services/shopifyService');
const gemini = require('../services/gemini');

const BLOB_FILENAME = 'custom-knowledge.txt';

/**
 * Fetch the custom knowledge text stored in Vercel Blob.
 * Returns an empty string if no file has been uploaded yet.
 * @returns {Promise<string>}
 */
async function getCustomKnowledge() {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    if (!blobs.length) return '';
    const response = await fetch(blobs[0].url);
    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  }
}

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

module.exports = async function handler(req, res) {
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
      getCustomKnowledge(),
    ]);

    // ── Generate AI reply ───────────────────────────────────────────────────
    const reply = await gemini.chat(
      message.trim(),
      conversationHistory,
      productsText,
      customKnowledge
    );

    console.log(`[CHAT] Reply sent: "${reply.slice(0, 80)}${reply.length > 80 ? '...' : ''}"`);

    return res.status(200).json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CHAT] Unexpected error:', err.message);
    console.error('[CHAT] Stack:', err.stack);
    console.error('[CHAT] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
