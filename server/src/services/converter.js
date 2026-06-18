const axios = require('axios');
const prisma = require('../config/prisma');
const { uploadFile } = require('../config/storage');

const CLOUDMERSIVE_URL = 'https://api.cloudmersive.com/convert/pptx/to/pdf';

function isConfigured() {
  return !!process.env.CLOUDMERSIVE_API_KEY;
}

/**
 * Converts a PPTX/PPT buffer to PDF using the Cloudmersive API.
 * Runs synchronously as part of the upload request — no queue needed.
 *
 * @param {Object} params
 * @param {string} params.contentId - Content record ID to update
 * @param {Buffer} params.fileBuffer - Raw PPTX/PPT file bytes
 * @param {string} params.fileId - UUID used for the rendered file path
 */
async function convertAndStore({ contentId, fileBuffer, fileId }) {
  if (!isConfigured()) {
    console.warn('CLOUDMERSIVE_API_KEY not set — PPTX conversion skipped.');
    await prisma.content.update({ where: { id: contentId }, data: { status: 'failed' } });
    return;
  }

  try {
    const response = await axios.post(CLOUDMERSIVE_URL, fileBuffer, {
      headers: {
        'Apikey': process.env.CLOUDMERSIVE_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      responseType: 'arraybuffer',
      timeout: 60000, // 60s — conversions can take a little while
      maxContentLength: 25 * 1024 * 1024,
    });

    const pdfBuffer = Buffer.from(response.data);
    const renderedPath = `rendered/${fileId}.pdf`;
    await uploadFile(renderedPath, pdfBuffer, 'application/pdf');

    // Count pages in the resulting PDF
    let pageCount = null;
    try {
      const pdfStr = pdfBuffer.toString('binary');
      const re = new RegExp('/Type\\s*/Page[^s]', 'g');
      const matches = pdfStr.match(re);
      pageCount = matches ? matches.length : null;
    } catch {}

    await prisma.content.update({
      where: { id: contentId },
      data: { pdfStoragePath: renderedPath, status: 'ready', pageCount }
    });

  } catch (err) {
    const detail = err.response?.data ? Buffer.from(err.response.data).toString('utf8').slice(0, 300) : err.message;
    console.error('Cloudmersive conversion failed:', detail);
    await prisma.content.update({ where: { id: contentId }, data: { status: 'failed' } });
  }
}

module.exports = { convertAndStore, isConfigured };
