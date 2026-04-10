/**
 * DEBUG ENDPOINT - Remove after testing
 * Returns the environment variables to help diagnose issues
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const envVars = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✓ SET (length: ' + process.env.GEMINI_API_KEY.length + ')' : '✗ NOT SET',
    SHOPIFY_STORE: process.env.SHOPIFY_STORE ? '✓ SET' : '✗ NOT SET',
    SHOPIFY_TOKEN: process.env.SHOPIFY_TOKEN ? '✓ SET (length: ' + process.env.SHOPIFY_TOKEN.length + ')' : '✗ NOT SET',
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? '✓ SET' : '✗ NOT SET',
  };

  return res.status(200).json(envVars);
};
