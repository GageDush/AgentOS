const fs = require('fs');
const { chromium } = require('@playwright/test');

(async () => {
  const md = fs.readFileSync('docs/AGENTOS_GAP_CLOSURE_MAD_REVIEW.md', 'utf8');
  const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Consolas,monospace;white-space:pre-wrap;line-height:1.35;padding:30px;font-size:11px;}</style></head><body>${esc}</body></html>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: 'docs/AGENTOS_GAP_CLOSURE_MAD_REVIEW.pdf',
    format: 'Letter',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });
  await browser.close();
  console.log('docs/AGENTOS_GAP_CLOSURE_MAD_REVIEW.pdf');
})();
