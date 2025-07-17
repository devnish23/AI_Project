const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class RedHatSecurityScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allAdvisories = [];
    }

    async initialize() {
        console.log('Launching browser...');
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for production
            defaultViewport: { width: 1280, height: 720 }
        });
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(30000);
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    async navigateToPage() {
        console.log('Navigating to Red Hat security page...');
        await this.page.goto('https://access.redhat.com/security/security-updates/security-advisories', {
            waitUntil: 'networkidle2'
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async applyFilters() {
        console.log('Applying filters...');
        try {
            await this.page.waitForSelector('[data-testid="filter-product"]', { timeout: 10000 });
            await this.page.click('[data-testid="filter-product"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-value="Red Hat Enterprise Linux"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-testid="filter-variant"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-value="Red Hat Enterprise Linux"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-testid="filter-architecture"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-value="x86_64"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-testid="filter-date-range"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.click('[data-value="last-month"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const applyButton = await this.page.$('[data-testid="apply-filters"]');
            if (applyButton) {
                await applyButton.click();
                console.log('Filters applied, waiting for results...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            console.log('Filter application failed, trying alternative selectors...');
            await this.applyFiltersAlternative();
        }
    }

    async applyFiltersAlternative() {
        try {
            const productDropdown = await this.page.$('select[name*="product"], .product-filter select, #product-filter');
            if (productDropdown) {
                await this.page.select('select[name*="product"], .product-filter select, #product-filter', 'Red Hat Enterprise Linux');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            const archDropdown = await this.page.$('select[name*="architecture"], .architecture-filter select, #architecture-filter');
            if (archDropdown) {
                await this.page.select('select[name*="architecture"], .architecture-filter select, #architecture-filter', 'x86_64');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            const dateDropdown = await this.page.$('select[name*="date"], .date-filter select, #date-filter');
            if (dateDropdown) {
                await this.page.select('select[name*="date"], .date-filter select, #date-filter', 'last-month');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            const buttons = await this.page.$$('button');
            for (let button of buttons) {
                const text = await this.page.evaluate(el => el.textContent.toLowerCase(), button);
                if (text.includes('apply') || text.includes('search') || text.includes('filter')) {
                    await button.click();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    break;
                }
            }
        } catch (error) {
            console.log('Alternative filter application also failed. Proceeding with default results...');
        }
    }

    async scrapeCurrentPage() {
        console.log('Scraping current page...');
        try {
            await this.page.waitForSelector('table, .advisory-table, [data-testid="advisories-table"]', { timeout: 10000 });
            const advisories = await this.page.evaluate(() => {
                const rows = [];
                const tables = document.querySelectorAll('table, .advisory-table, [data-testid="advisories-table"]');
                let targetTable = null;
                for (let table of tables) {
                    const headers = table.querySelectorAll('th, .header-cell');
                    const headerTexts = Array.from(headers).map(h => h.textContent.toLowerCase());
                    if (headerTexts.some(text => text.includes('advisory') || text.includes('synopsis') || text.includes('severity'))) {
                        targetTable = table;
                        break;
                    }
                }
                if (!targetTable) {
                    targetTable = tables[0];
                }
                if (targetTable) {
                    const dataRows = targetTable.querySelectorAll('tbody tr, .data-row, tr:not(:first-child)');
                    dataRows.forEach(row => {
                        const cells = row.querySelectorAll('td, .cell');
                        if (cells.length >= 4) {
                            const advisory = {
                                advisory: cells[0]?.textContent?.trim() || '',
                                synopsis: cells[1]?.textContent?.trim() || '',
                                severity: cells[2]?.textContent?.trim() || '',
                                products: cells[3]?.textContent?.trim() || '',
                                publishDate: cells[4]?.textContent?.trim() || ''
                            };
                            if (advisory.advisory && advisory.advisory !== '') {
                                rows.push(advisory);
                            }
                        }
                    });
                }
                return rows;
            });
            console.log(`Found ${advisories.length} advisories on current page`);
            this.allAdvisories.push(...advisories);
            return advisories.length;
        } catch (error) {
            console.error('Error scraping current page:', error.message);
            return 0;
        }
    }

    async hasNextPage() {
        try {
            const nextButton = await this.page.$('button[aria-label="Go to next page"], button[title="Next page"], .pagination button:last-child, button:has(svg)');
            if (nextButton) {
                const isDisabled = await this.page.evaluate(el => {
                    return el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
                }, nextButton);
                if (!isDisabled) {
                    return true;
                }
            }
            const paginationInfo = await this.page.evaluate(() => {
                const paginationText = document.querySelector('.pagination, .pager, [class*="pagination"]');
                if (paginationText) {
                    const text = paginationText.textContent;
                    const ofMatch = text.match(/of\s+(\d+)/);
                    const currentPageMatch = text.match(/(\d+)\s+of\s+\d+/) || text.match(/page\s+(\d+)/i);
                    if (ofMatch && currentPageMatch) {
                        const totalPages = parseInt(ofMatch[1]);
                        const currentPage = parseInt(currentPageMatch[1]);
                        return { currentPage, totalPages, hasMore: currentPage < totalPages };
                    }
                }
                const recordInfo = document.querySelector('.results-info, .record-count, [class*="results"]');
                if (recordInfo) {
                    const text = recordInfo.textContent;
                    const recordMatch = text.match(/(\d+)-(\d+)\s+of\s+(\d+)/);
                    if (recordMatch) {
                        const endRecord = parseInt(recordMatch[2]);
                        const totalRecords = parseInt(recordMatch[3]);
                        return { hasMore: endRecord < totalRecords };
                    }
                }
                return { hasMore: false };
            });
            return paginationInfo.hasMore;
        } catch (error) {
            console.log('Error checking for next page:', error.message);
            return false;
        }
    }

    async getCurrentPageNumber() {
        try {
            const pageInfo = await this.page.evaluate(() => {
                const paginationElement = document.querySelector('.pagination, .pager, [class*="pagination"], .results-info');
                if (paginationElement) {
                    const text = paginationElement.textContent;
                    const pageMatch = text.match(/(?:page\s+)?(\d+)\s+of\s+\d+/i);
                    if (pageMatch) {
                        return parseInt(pageMatch[1]);
                    }
                    const activePageElement = paginationElement.querySelector('.active, [aria-current="page"], .current');
                    if (activePageElement) {
                        const pageNum = parseInt(activePageElement.textContent.trim());
                        if (!isNaN(pageNum)) return pageNum;
                    }
                }
                const pageInput = document.querySelector('input[type="number"], input[aria-label*="page"]');
                if (pageInput && pageInput.value) {
                    return parseInt(pageInput.value);
                }
                return 1;
            });
            return pageInfo || 1;
        } catch (error) {
            console.log('Error getting current page number:', error.message);
            return 1;
        }
    }

    async getMaxPageNumber() {
        try {
            const maxPage = await this.page.evaluate(() => {
                const paginationElement = document.querySelector('.pagination, .pager, [class*="pagination"], .results-info');
                if (paginationElement) {
                    const text = paginationElement.textContent;
                    const totalPagesMatch = text.match(/of\s+(\d+)/);
                    if (totalPagesMatch) {
                        return parseInt(totalPagesMatch[1]);
                    }
                }
                const pageButtons = document.querySelectorAll('.pagination button, .pager button');
                let maxPageFromButtons = 1;
                pageButtons.forEach(button => {
                    const pageNum = parseInt(button.textContent.trim());
                    if (!isNaN(pageNum) && pageNum > maxPageFromButtons) {
                        maxPageFromButtons = pageNum;
                    }
                });
                return maxPageFromButtons;
            });
            return maxPage || 1;
        } catch (error) {
            console.log('Error getting max page number:', error.message);
            return 1;
        }
    }

    async goToNextPage() {
        try {
            console.log('Navigating to next page...');
            const nextButton = await this.page.$('button[aria-label="Go to next page"], button[title="Next page"]');
            if (nextButton) {
                await nextButton.click();
                console.log('Clicked next page button');
                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.page.waitForSelector('table, .advisory-table, tbody', { timeout: 15000 });
                return true;
            }
            const paginationButtons = await this.page.$('.pagination button, .pager button, [class*="pagination"] button');
            for (let button of paginationButtons) {
                const buttonText = await this.page.evaluate(el => {
                    const text = el.textContent.trim();
                    const hasArrow = text.includes('›') || text.includes('>') || text.includes('→');
                    const ariaLabel = el.getAttribute('aria-label') || '';
                    const title = el.getAttribute('title') || '';
                    return {
                        hasArrow,
                        isNext: ariaLabel.toLowerCase().includes('next') || title.toLowerCase().includes('next'),
                        isDisabled: el.disabled || el.classList.contains('disabled')
                    };
                }, button);
                if ((buttonText.hasArrow || buttonText.isNext) && !buttonText.isDisabled) {
                    await button.click();
                    console.log('Clicked pagination arrow button');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await this.page.waitForSelector('table, .advisory-table, tbody', { timeout: 15000 });
                    return true;
                }
            }
            const currentPageInfo = await this.page.evaluate(() => {
                const paginationArea = document.querySelector('.pagination, .pager, [class*="pagination"]');
                if (paginationArea) {
                    const text = paginationArea.textContent;
                    const currentPageMatch = text.match(/(\d+)\s+of\s+(\d+)/);
                    if (currentPageMatch) {
                        const currentPage = parseInt(currentPageMatch[1]);
                        const totalPages = parseInt(currentPageMatch[2]);
                        return { currentPage, totalPages };
                    }
                }
                return null;
            });
            if (currentPageInfo && currentPageInfo.currentPage < currentPageInfo.totalPages) {
                const nextPageNumber = currentPageInfo.currentPage + 1;
                const pageButton = await this.page.$(`button:contains("${nextPageNumber}"), a:contains("${nextPageNumber}")`);
                if (pageButton) {
                    await pageButton.click();
                    console.log(`Clicked page ${nextPageNumber} button`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await this.page.waitForSelector('table, .advisory-table, tbody', { timeout: 15000 });
                    return true;
                }
            }
            console.log('Could not find next page button');
            return false;
        } catch (error) {
            console.error('Error navigating to next page:', error.message);
            return false;
        }
    }

    async scrapeAllPages() {
        console.log('Starting to scrape all pages...');
        let pageCount = 1;
        let hasMore = true;
        while (hasMore) {
            const currentPage = await this.getCurrentPageNumber();
            const maxPage = await this.getMaxPageNumber();
            console.log(`\n=== Scraping page ${currentPage} of ${maxPage} ===`);
            const recordInfo = await this.page.evaluate(() => {
                const recordElement = document.querySelector('.results-info, .record-count, [class*="results"]');
                if (recordElement) {
                    const text = recordElement.textContent;
                    const recordMatch = text.match(/(\d+)-(\d+)\s+of\s+(\d+)/);
                    if (recordMatch) {
                        return {
                            start: parseInt(recordMatch[1]),
                            end: parseInt(recordMatch[2]),
                            total: parseInt(recordMatch[3])
                        };
                    }
                }
                return null;
            });
            if (recordInfo) {
                console.log(`Records ${recordInfo.start}-${recordInfo.end} of ${recordInfo.total} total`);
            }
            const advisoriesOnPage = await this.scrapeCurrentPage();
            if (advisoriesOnPage === 0) {
                console.log('No advisories found on this page, stopping...');
                break;
            }
            console.log(`Found ${advisoriesOnPage} advisories on this page`);
            console.log(`Total advisories collected so far: ${this.allAdvisories.length}`);
            hasMore = await this.hasNextPage();
            if (hasMore) {
                console.log('More pages available, navigating to next page...');
                const success = await this.goToNextPage();
                if (!success) {
                    console.log('Failed to navigate to next page, stopping...');
                    break;
                }
                pageCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
                const newPage = await this.getCurrentPageNumber();
                if (newPage === currentPage) {
                    console.log('Page number did not change, stopping to avoid infinite loop...');
                    break;
                }
            } else {
                console.log('No more pages available.');
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log(`\n=== Scraping completed! ===`);
        console.log(`Total advisories collected: ${this.allAdvisories.length}`);
        console.log(`Pages processed: ${pageCount}`);
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonFileName = `redhat_advisories_${timestamp}.json`;
        fs.writeFileSync(jsonFileName, JSON.stringify(this.allAdvisories, null, 2));
        console.log(`Results saved to ${jsonFileName}`);
        const csvFileName = `redhat_advisories_${timestamp}.csv`;
        const csvContent = this.convertToCSV(this.allAdvisories);
        fs.writeFileSync(csvFileName, csvContent);
        console.log(`Results saved to ${csvFileName}`);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                const escaped = value.replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToPage();
            await this.applyFilters();
            await this.scrapeAllPages();
            await this.saveResults();
            console.log('\n=== Scraping Summary ===');
            console.log(`Total advisories found: ${this.allAdvisories.length}`);
            console.log('Data saved in both JSON and CSV formats');
        } catch (error) {
            console.error('Error during scraping:', error);
        } finally {
            await this.close();
        }
    }
}

async function main() {
    const scraper = new RedHatSecurityScraper();
    await scraper.run();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RedHatSecurityScraper; 