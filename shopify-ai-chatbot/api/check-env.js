/**
 * Simple test endpoint to verify environment variables are set
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'NOT SET',
    SHOPIFY_STORE: process.env.SHOPIFY_STORE ? 'SET: ' + process.env.SHOPIFY_STORE : 'NOT SET',
    SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN ? 'SET (length: ' + process.env.SHOPIFY_TOKEN.length + ')' : 'NOT SET',
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? 'SET (length: ' + process.env.BLOB_READ_WRITE_TOKEN.length + ')' : 'NOT SET',
  });
};
