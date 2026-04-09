/**
 * POST /api/upload  — Accept a file upload, parse it, store text in Vercel Blob.
 * GET  /api/upload  — Return whether custom knowledge data exists and its size.
 *
 * Accepted file types: application/pdf, text/plain, text/csv
 * Max file size: 10 MB
 */

const { put, list } = require('@vercel/blob');
const formidable = require('formidable');
const fs = require('fs');
const { parseFile } = require('../services/fileParser');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'text/csv'];
const BLOB_FILENAME = 'custom-knowledge.txt';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      multiples: false,
    });
    form.parse(req, (err, fields, files) => {
      if (err) {
        if (err.code === 1009 || (err.message && err.message.includes('maxFileSize'))) {
          return reject(new Error('FILE_TOO_LARGE'));
        }
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET — check if custom knowledge exists ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: BLOB_FILENAME });
      if (!blobs.length) return res.status(200).json({ hasCustomData: false, characters: 0 });
      const response = await fetch(blobs[0].url);
      const text = await response.text();
      return res.status(200).json({ hasCustomData: true, characters: text.length });
    } catch {
      return res.status(200).json({ hasCustomData: false, characters: 0 });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── POST — upload, parse, and store file ────────────────────────────────────
  let tempFilePath = null;

  try {
    const { files } = await parseForm(req);

    const fileField = files.file;
    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided. Please attach a file with field name "file".' });
    }

    tempFilePath = uploadedFile.filepath;
    const mimetype = uploadedFile.mimetype || '';

    if (!ACCEPTED_TYPES.includes(mimetype)) {
      return res.status(400).json({
        error: `Unsupported file type: ${mimetype}. Please upload a PDF, TXT, or CSV file.`,
      });
    }

    const parsedText = await parseFile(tempFilePath, mimetype);

    // Save parsed text to Vercel Blob — addRandomSuffix false so it always
    // overwrites the same file when a new one is uploaded
    await put(BLOB_FILENAME, parsedText, {
      access: 'public',
      contentType: 'text/plain',
      addRandomSuffix: false,
    });

    console.log(`[UPLOAD] Stored in Blob — ${parsedText.length} characters`);

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
    if (tempFilePath) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.warn('[UPLOAD] Could not delete temp file:', err.message);
      });
    }
  }
};