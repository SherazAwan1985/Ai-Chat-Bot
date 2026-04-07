/**
 * POST /api/upload  — Accept a file upload, parse it, store text in Vercel KV.
 * GET  /api/upload  — Return whether custom knowledge data exists and its size.
 *
 * Accepted file types: application/pdf, text/plain, text/csv
 * Max file size: 10 MB
 */

const { kv } = require('@vercel/kv');
const formidable = require('formidable');
const fs = require('fs');
const { parseFile } = require('../services/fileParser');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'text/csv'];

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Parse the incoming multipart request with formidable.
 * Returns { fields, files } or throws on validation failure.
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      multiples: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        // formidable throws a specific error code for files that exceed the limit
        if (err.code === 1009 || (err.message && err.message.includes('maxFileSize'))) {
          return reject(new Error('FILE_TOO_LARGE'));
        }
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── GET — return status of stored custom knowledge ──────────────────────────
  if (req.method === 'GET') {
    try {
      const stored = await kv.get('custom_knowledge');
      if (!stored) {
        return res.status(200).json({ hasCustomData: false, characters: 0 });
      }
      return res
        .status(200)
        .json({ hasCustomData: true, characters: stored.length });
    } catch (err) {
      console.error('[UPLOAD GET] KV error:', err.message);
      return res.status(500).json({ error: 'Failed to check custom knowledge.' });
    }
  }

  // ── POST — accept, parse, and store a file ──────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath = null;

  try {
    const { files } = await parseForm(req);

    // formidable v3 wraps each field in an array
    const fileField = files.file;
    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided. Please attach a file with field name "file".' });
    }

    tempFilePath = uploadedFile.filepath;
    const mimetype = uploadedFile.mimetype || '';

    // Validate file type
    if (!ACCEPTED_TYPES.includes(mimetype)) {
      return res.status(400).json({
        error: `Unsupported file type: ${mimetype}. Please upload a PDF, TXT, or CSV file.`,
      });
    }

    // Parse the file into plain text
    const parsedText = await parseFile(tempFilePath, mimetype);

    // Store in Vercel KV
    await kv.set('custom_knowledge', parsedText);

    console.log(`[UPLOAD] File stored successfully — ${parsedText.length} characters`);

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      characters: parsedText.length,
    });
  } catch (err) {
    if (err.message === 'FILE_TOO_LARGE') {
      return res.status(400).json({ error: 'File is too large. Maximum allowed size is 10 MB.' });
    }
    console.error('[UPLOAD POST] Error:', err.message);
    return res.status(500).json({ error: 'Failed to process the uploaded file. Please try again.' });
  } finally {
    // Clean up temp file regardless of outcome
    if (tempFilePath) {
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn('[UPLOAD] Could not delete temp file:', unlinkErr.message);
        }
      });
    }
  }
}
