// scripts/scrapeRedHatAdvisories.js
const puppeteer = require('puppeteer');
const fs = require('fs');

// Static EOL/EOSL mapping
const rhelLifecycle = {
  '7': { eol: '2024-06-30', eosl: '2026-06-30' },
  '8': { eol: '2029-05-31', eosl: '2031-05-31' },
  '9': { eol: '2032-05-31', eosl: '2034-05-31' }
};

function parseRhelVersion(products) {
  const match = products.match(/Red Hat Enterprise Linux (\d+)/);
  return match ? match[1] : null;
}

async function extractCvesFromDetail(page, advisoryLink) {
  try {
    await page.goto(advisoryLink, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    const cves = await page.evaluate(() => {
      const cveLinks = Array.from(document.querySelectorAll('a'))
        .map(a => a.textContent)
        .filter(t => t && t.startsWith('CVE-'));
      return Array.from(new Set(cveLinks));
    });
    return cves;
  } catch (err) {
    return [];
  }
}

async function dismissCookieConsent(page) {
  // Try common selectors for cookie banners/buttons
  const selectors = [
    'button#truste-consent-button', // TrustArc
    'button[aria-label="Accept cookies"]',
    'button:contains("Accept")',
    'button:contains("I Agree")',
    'button:contains("Agree")',
    '.truste_button',
    '.cookie-accept',
    '.cc-btn.cc-accept-all',
    '.osano-cm-accept-all',
    '.cookie-consent-accept',
    'button[title="Accept"]',
    'button[title="OK"]',
    'button[title="Got it"]',
    'button[title="Allow all cookies"]',
  ];
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      await page.click(selector);
      console.log(`Clicked cookie consent button: ${selector}`);
      await page.waitForTimeout(1000);
      break;
    } catch (e) {
      // Ignore if not found
    }
  }
}

async function scrapeAdvisoriesPage(page, pageNum, detailPage) {
  await page.goto(`https://access.redhat.com/security/security-updates/security-advisories?page=${pageNum}`, { waitUntil: 'networkidle2' });
  await dismissCookieConsent(page);
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(row => {
      const tds = row.querySelectorAll('td');
      const advisoryId = tds[0]?.innerText.trim();
      const advisoryLink = tds[0]?.querySelector('a')?.href || '';
      const synopsis = tds[1]?.innerText.trim();
      const severity = tds[2]?.innerText.trim();
      const products = tds[3]?.innerText.trim();
      const publishDate = tds[4]?.innerText.trim();
      return { advisoryId, advisoryLink, synopsis, severity, products, publishDate };
    });
  });
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const detailPage = await browser.newPage();
  let allAdvisories = [];
  const maxPages = 2;
  const fetchedAt = new Date().toISOString();
  for (let i = 1; i <= maxPages; i++) {
    console.log(`Scraping page ${i}...`);
    try {
      const advisories = await scrapeAdvisoriesPage(page, i, detailPage);
      for (const adv of advisories) {
        adv.rhel_version = parseRhelVersion(adv.products);
        if (adv.rhel_version && rhelLifecycle[adv.rhel_version]) {
          adv.eol = rhelLifecycle[adv.rhel_version].eol;
          adv.eosl = rhelLifecycle[adv.rhel_version].eosl;
        } else {
          adv.eol = null;
          adv.eosl = null;
        }
        adv.fetched_at = fetchedAt;
        adv.cves = adv.advisoryLink ? await extractCvesFromDetail(detailPage, adv.advisoryLink) : [];
      }
      allAdvisories = allAdvisories.concat(advisories);
    } catch (err) {
      console.error(`Error scraping page ${i}:`, err.message);
    }
  }
  await browser.close();
  fs.writeFileSync('rhel_advisories_detailed.json', JSON.stringify(allAdvisories, null, 2));
  console.log(`Saved ${allAdvisories.length} advisories to rhel_advisories_detailed.json`);
}

if (require.main === module) {
  main().then(() => process.exit(0));
}