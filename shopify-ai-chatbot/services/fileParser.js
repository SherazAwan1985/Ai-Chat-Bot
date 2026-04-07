/**
 * File Parser Service — parses PDF, TXT, and CSV files into plain text.
 * Returns a string of maximum 15,000 characters to avoid exceeding Gemini context.
 */

const fs = require('fs');
const path = require('path');

const MAX_CHARS = 15000;

/**
 * Parse a file at the given path based on its MIME type.
 * @param {string} filePath - Absolute path to the temp file
 * @param {string} mimetype - MIME type of the uploaded file
 * @returns {Promise<string>} Extracted plain text, trimmed to MAX_CHARS
 */
async function parseFile(filePath, mimetype) {
  let text = '';

  if (mimetype === 'application/pdf') {
    // pdf-parse reads a Buffer and returns extracted text
    const pdfParse = require('pdf-parse');
    const buffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(buffer);
    text = data.text || '';
  } else if (mimetype === 'text/plain') {
    text = await fs.promises.readFile(filePath, 'utf-8');
  } else if (mimetype === 'text/csv') {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    // Convert CSV rows into readable lines, separating columns with " | "
    text = raw
      .split('\n')
      .map((line) =>
        line
          .split(',')
          .map((cell) => cell.trim().replace(/^"|"$/g, ''))
          .join(' | ')
      )
      .filter((line) => line.trim().length > 0)
      .join('\n');
  } else {
    throw new Error(`Unsupported file type: ${mimetype}`);
  }

  // Normalise whitespace and enforce character limit
  text = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS);
  }

  return text;
}

module.exports = { parseFile };
