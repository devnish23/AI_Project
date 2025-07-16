const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Go to Red Hat Security main page
  await page.goto('https://access.redhat.com/security/', { waitUntil: 'networkidle2' });

  // 2. Take a screenshot for debugging
  await page.screenshot({ path: 'debug_redhat.png', fullPage: true });

  // 3. Try to click the "Security advisories" link robustly
  try {
    // Try by href first
    await page.waitForSelector('a[href*="security-updates/security-advisories"]', { timeout: 10000 });
    await page.click('a[href*="security-updates/security-advisories"]');
  } catch (e) {
    // If not found, try by link text
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(a => a.textContent && a.textContent.includes('Security advisories'));
      if (link) link.click();
    });
  }
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // 4. Set Product filter to "Red Hat Enterprise Linux"
  await page.waitForSelector('button[aria-haspopup="listbox"]');
  const buttons = await page.$$('button[aria-haspopup="listbox"]');
  await buttons[0].click(); // Click the first dropdown (Product)
  await page.waitForTimeout(500);

  // Find and click the "Red Hat Enterprise Linux" option
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li'));
    const rhel = items.find(li => li.textContent && li.textContent.includes('Red Hat Enterprise Linux'));
    if (rhel) rhel.click();
  });
  await page.waitForTimeout(2000); // Wait for table to update

  // 5. Set Date Range filter to "Last Week"
  await page.waitForSelector('button[data-testid="date-range-button"]');
  await page.click('button[data-testid="date-range-button"]');
  await page.waitForSelector('li[role="option"]');
  const options = await page.$$('li[role="option"]');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text && text.includes('Last week')) {
      await option.click();
      break;
    }
  }
  await page.waitForTimeout(2000); // Wait for table to update

  // 6. Scrape the advisories table
  const advisories = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(row => {
      const tds = row.querySelectorAll('td');
      return {
        advisory: tds[0]?.innerText.trim(),
        link: tds[0]?.querySelector('a')?.href,
        synopsis: tds[1]?.innerText.trim(),
        severity: tds[2]?.innerText.trim(),
        products: tds[3]?.innerText.trim(),
        publishDate: tds[4]?.innerText.trim(),
      };
    });
  });

  // 7. Save to file
  fs.writeFileSync('rhel_advisories_last_week.json', JSON.stringify(advisories, null, 2));
  console.log(`Saved ${advisories.length} advisories to rhel_advisories_last_week.json`);

  // 8. Upload to MongoDB
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://localhost:27017/infra_tracker', { useNewUrlParser: true, useUnifiedTopology: true });
  const advisorySchema = new mongoose.Schema({ advisory: String }, { strict: false });
  const Advisory = mongoose.models.RedHatAdvisory || mongoose.model('RedHatAdvisory', advisorySchema);

  for (const adv of advisories) {
    // Use advisory/link as unique identifier for upsert
    await Advisory.updateOne(
      { advisory: adv.advisory, link: adv.link },
      { $set: adv },
      { upsert: true }
    );
  }
  console.log(`Uploaded ${advisories.length} advisories to MongoDB`);
  await mongoose.disconnect();

  await browser.close();
})();