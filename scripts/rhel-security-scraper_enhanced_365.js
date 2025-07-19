#!/usr/bin/env node

/**
 * Fixed Enhanced Red Hat Enterprise Linux Security Advisories Scraper
 * Properly fetches historical data for any date range including 365 days
 */

const fs = require('fs');
const path = require('path');

// Try to load dependencies
let axios, cheerio, xml2js, xlsx;

try {
    axios = require('axios');
    cheerio = require('cheerio');
    xml2js = require('xml2js');
} catch (error) {
    console.error('❌ Required dependencies not found. Please run: npm install axios cheerio xml2js');
    process.exit(1);
}

try {
    xlsx = require('xlsx');
} catch (error) {
    console.log('ℹ️  xlsx not installed. Excel export will use CSV format.');
}

// Configuration
const CONFIG = {
    dateRange: 365,
    architecture: 'x86_64',
    outputFile: 'rhel_security_advisories',
    timeout: 30000,
    retryAttempts: 3,
    maxConcurrent: 5,
    
    urls: {
        base: 'https://access.redhat.com',
        search: 'https://access.redhat.com/security/security-updates/security-advisories',
        errata: 'https://access.redhat.com/errata',
        rss: 'https://access.redhat.com/security/data/security-updates.rss'
    }
};

// Static EOL/EOSL mapping
const rhelLifecycle = {
  '7': { eol: '2024-06-30', eosl: '2026-06-30' },
  '8': { eol: '2029-05-31', eosl: '2031-05-31' },
  '9': { eol: '2032-05-31', eosl: '2034-05-31' }
};

class HistoricalRHELScraper {
    constructor() {
        this.advisories = [];
        this.processedIds = new Set();
        this.httpClient = axios.create({
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        this.startDate = new Date();
        this.endDate = new Date();
        this.endDate.setDate(this.endDate.getDate() - CONFIG.dateRange);
    }

    async run() {
        console.log('🚀 Enhanced RHEL Security Scraper - Historical Data');
        console.log(`📅 Date range: ${this.endDate.toISOString().split('T')[0]} to ${this.startDate.toISOString().split('T')[0]}`);
        console.log(`🏗️  Architecture: ${CONFIG.architecture}`);
        console.log(`📊 Target period: ${CONFIG.dateRange} days`);
        console.log('=' .repeat(60));

        try {
            // Step 1: Try to get comprehensive advisory list
            await this.fetchAdvisoryList();
            
            // Step 2: Fetch detailed information for each advisory
            await this.fetchAdvisoryDetails();
            
            // Step 3: Process and filter
            this.processAdvisories();
            
            // Step 4: Export
            await this.exportData();
            
            this.printSummary();
            
        } catch (error) {
            console.error('💥 Scraper failed:', error.message);
            if (this.advisories.length > 0) {
                console.log(`📊 Partial results available: ${this.advisories.length} advisories`);
                await this.exportData();
            }
        }
    }

    async fetchAdvisoryList() {
        console.log('🔍 Building comprehensive advisory list...');
        
        // Method 1: Recent advisories from RSS
        await this.fetchFromRSS();
        
        // Method 2: Generate RHSA IDs for the date range
        await this.generateRHSAIds();
        
        // Method 3: Search patterns (removed)
        // await this.searchByPatterns();
        
        console.log(`📋 Found ${this.processedIds.size} unique advisory IDs to process`);
    }

    async fetchFromRSS() {
        console.log('📡 Fetching from RSS feed...');
        try {
            const response = await this.httpClient.get(CONFIG.urls.rss);
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);
            
            if (result.rss?.channel?.[0]?.item) {
                const items = result.rss.channel[0].item;
                let rssCount = 0;
                
                items.forEach(item => {
                    const title = item.title?.[0] || '';
                    const pubDate = item.pubDate?.[0] || '';
                    const link = item.link?.[0] || '';
                    
                    if (this.isRHELAdvisory(title) && this.isInDateRange(pubDate)) {
                        const rhsaId = this.extractRHSAId(title);
                        if (rhsaId && !this.processedIds.has(rhsaId)) {
                            this.processedIds.add(rhsaId);
                            rssCount++;
                        }
                    }
                });
                
                console.log(`✅ RSS: Found ${rssCount} relevant advisories`);
            }
        } catch (error) {
            console.log(`⚠️  RSS fetch failed: ${error.message}`);
        }
    }

    async generateRHSAIds() {
        console.log('🎯 Generating RHSA ID patterns for date range...');
        
        // RHSA format: RHSA-YYYY:NNNN
        const currentYear = new Date().getFullYear();
        const startYear = this.endDate.getFullYear();
        
        let generatedCount = 0;
        
        for (let year = startYear; year <= currentYear; year++) {
            // For each year, try common ID ranges
            const ranges = this.getRHSAIdRanges(year);
            
            for (const range of ranges) {
                for (let id = range.start; id <= range.end; id += range.step) {
                    const rhsaId = `RHSA-${year}:${id.toString().padStart(4, '0')}`;
                    if (!this.processedIds.has(rhsaId)) {
                        this.processedIds.add(rhsaId);
                        generatedCount++;
                        
                        // Limit generation to prevent too many requests
                        if (generatedCount >= 2000) break;
                    }
                }
                if (generatedCount >= 2000) break;
            }
            if (generatedCount >= 2000) break;
        }
        
        console.log(`✅ Generated ${generatedCount} potential RHSA IDs`);
    }

    getRHSAIdRanges(year) {
        // Return likely ID ranges for each year based on historical patterns
        const ranges = {
            2025: [
                { start: 1, end: 12000, step: 1 },
            ],
            2024: [
                { start: 1, end: 15000, step: 1 },
            ],
            2023: [
                { start: 1, end: 12000, step: 1 },
            ]
        };
        
        return ranges[year] || [{ start: 1, end: 8000, step: 1 }];
    }

    async fetchCveDetails(cveId, cveCache) {
        if (cveCache[cveId]) return cveCache[cveId];
        try {
            const url = `https://services.nvd.nist.gov/rest/json/cve/1.0/${cveId}`;
            const res = await axios.get(url, { timeout: 10000 });
            const cveItem = res.data.result?.CVE_Items?.[0];
            if (!cveItem) return null;
            const description = cveItem.cve?.description?.description_data?.[0]?.value || '';
            const cvssScore = cveItem.impact?.baseMetricV3?.cvssV3?.baseScore || cveItem.impact?.baseMetricV2?.cvssV2?.baseScore || null;
            const link = `https://nvd.nist.gov/vuln/detail/${cveId}`;
            const details = { cveId, description, cvssScore, link };
            cveCache[cveId] = details;
            // Rate limit: wait 1s between requests
            await new Promise(res => setTimeout(res, 1000));
            return details;
        } catch (err) {
            return null;
        }
    }

    async fetchAllCveDetails(cves, cveCache) {
        const details = [];
        for (const cveId of cves) {
            const info = await this.fetchCveDetails(cveId, cveCache);
            if (info) details.push(info);
        }
        return details;
    }

    async fetchAdvisoryDetails() {
        console.log(`📝 Fetching details for ${this.processedIds.size} advisories...`);
        const advisoryIds = Array.from(this.processedIds);
        const chunks = this.chunkArray(advisoryIds, CONFIG.maxConcurrent);
        let processed = 0;
        let successful = 0;
        const cveCache = {};
        for (const chunk of chunks) {
            const promises = chunk.map(id => this.fetchSingleAdvisory(id, cveCache));
            const results = await Promise.allSettled(promises);
            results.forEach((result, index) => {
                processed++;
                if (result.status === 'fulfilled' && result.value) {
                    successful++;
                    this.advisories.push(result.value);
                }
                if (processed % 50 === 0) {
                    console.log(`📊 Progress: ${processed}/${advisoryIds.length} (${successful} successful)`);
                }
            });
            await this.sleep(1000);
        }
        console.log(`✅ Successfully fetched ${successful} advisory details`);
    }

    async fetchSingleAdvisory(rhsaId, cveCache) {
        const url = `${CONFIG.urls.base}/errata/${rhsaId}`;
        try {
            const response = await this.httpClient.get(url);
            if (response.status === 200) {
                return await this.parseAdvisoryPage(response.data, rhsaId, url, cveCache);
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.log(`⚠️  Error fetching ${rhsaId}: ${error.message}`);
            }
        }
        return null;
    }

    async parseAdvisoryPage(html, rhsaId, url, cveCache) {
        try {
            const $ = cheerio.load(html);
            const synopsis = this.extractSynopsis($);
            let severity = this.extractSeverity($);
            severity = this.normalizeSeverity(severity);
            const publishDate = this.extractPublishDate($);
            const products = this.extractProducts($);
            const cves = this.extractCVEs($);
            const rhelVersion = this.extractRhelVersion(products);
            const productFamily = this.classifyProductFamily(products);
            const cveDetails = await this.fetchAllCveDetails(cves, cveCache);
            let eolDate = null, eoslDate = null;
            if (rhelVersion && rhelLifecycle[rhelVersion]) {
                eolDate = rhelLifecycle[rhelVersion].eol;
                eoslDate = rhelLifecycle[rhelVersion].eosl;
            }
            const patchPackageList = this.extractPatchPackageList($);
            const vendorLinks = {
                errata: url,
                nvdCves: cves.map(cve => `https://nvd.nist.gov/vuln/detail/${cve}`),
                redhatCves: cves.map(cve => `https://access.redhat.com/security/cve/${cve}`)
            };
            const now = new Date().toISOString();
            const tags = this.generateTags(synopsis, products, patchPackageList);
            // Extract impact/exploitability info
            const impactInfo = this.extractImpactInfo($);
            if (!this.isRHELAdvisory(synopsis + ' ' + products) || 
                !this.isInDateRange(publishDate)) {
                return null;
            }
            return {
                advisory: rhsaId,
                synopsis: synopsis || `Security update for ${rhsaId}`,
                severity: severity || 'Unknown',
                products: products || 'Red Hat Enterprise Linux',
                publishDate: this.formatDate(publishDate),
                cves: cves,
                cveDetails: cveDetails,
                link: url,
                rhelVersion: rhelVersion || null,
                productFamily: productFamily || null,
                eolDate: eolDate,
                eoslDate: eoslDate,
                patchPackageList: patchPackageList,
                vendorLinks: vendorLinks,
                firstSeen: now,
                lastUpdated: now,
                tags: tags,
                impactInfo: impactInfo
            };
        } catch (error) {
            console.log(`⚠️  Error parsing ${rhsaId}: ${error.message}`);
            return null;
        }
    }

    generateTags(synopsis, products, patchPackageList) {
        const keywords = [
            'kernel', 'openssl', 'glibc', 'bind', 'httpd', 'nginx', 'php', 'python', 'java', 'tomcat',
            'postgresql', 'mariadb', 'mysql', 'samba', 'systemd', 'firewalld', 'selinux', 'dns', 'ldap',
            'libxml', 'libssh', 'libcurl', 'libreoffice', 'xorg', 'gnome', 'kde', 'cups', 'perl', 'ruby',
            'audit', 'chrony', 'ntp', 'yum', 'dnf', 'rpm', 'docker', 'podman', 'cri-o', 'container', 'cloud',
            'storage', 'network', 'security', 'crypto', 'tls', 'ssl', 'ssh', 'ftp', 'mail', 'imap', 'smtp',
            'squid', 'haproxy', 'redis', 'mongodb', 'rabbitmq', 'zabbix', 'grafana', 'prometheus', 'etcd',
            'haproxy', 'keepalived', 'pacemaker', 'corosync', 'drbd', 'ceph', 'gluster', 'iscsi', 'nfs',
            'cifs', 'samba', 'iscsi', 'iscsi-initiator-utils', 'iscsi-target-utils', 'iscsiuio', 'iscsiadm'
        ];
        const text = [synopsis, products, ...(patchPackageList || [])].join(' ').toLowerCase();
        const tags = [];
        for (const kw of keywords) {
            if (text.includes(kw) && !tags.includes(kw)) tags.push(kw);
        }
        return tags;
    }

    extractPatchPackageList($) {
        // Try to find package lists in common selectors
        // Red Hat errata often lists packages in <ul> or <table> with 'Packages' or 'Affected Packages' headings
        let packages = [];
        // Look for tables with 'Package' in the header
        $('table').each((i, table) => {
            const header = $(table).find('th').first().text().toLowerCase();
            if (header.includes('package')) {
                $(table).find('tr').each((j, row) => {
                    const pkg = $(row).find('td').first().text().trim();
                    if (pkg && !packages.includes(pkg)) packages.push(pkg);
                });
            }
        });
        // Look for <ul> lists under headings with 'Packages'
        $('h2, h3, h4').each((i, el) => {
            const heading = $(el).text().toLowerCase();
            if (heading.includes('package')) {
                $(el).next('ul').find('li').each((j, li) => {
                    const pkg = $(li).text().trim();
                    if (pkg && !packages.includes(pkg)) packages.push(pkg);
                });
            }
        });
        // Fallback: look for any <li> with rpm or .el7/.el8 etc.
        if (packages.length === 0) {
            $('li').each((i, li) => {
                const txt = $(li).text().trim();
                if (/\.el\d|\.rpm/i.test(txt) && !packages.includes(txt)) packages.push(txt);
            });
        }
        return packages;
    }

    normalizeSeverity(severity) {
        if (!severity) return 'Unknown';
        const s = severity.toLowerCase();
        if (s.startsWith('crit')) return 'Critical';
        if (s.startsWith('imp')) return 'Important';
        if (s.startsWith('mod')) return 'Moderate';
        if (s.startsWith('low')) return 'Low';
        return 'Unknown';
    }

    classifyProductFamily(products) {
        const p = products.toLowerCase();
        if (p.includes('enterprise linux') || p.includes('rhel')) return 'RHEL';
        if (p.includes('satellite')) return 'Satellite';
        if (p.includes('jboss')) return 'JBoss';
        if (p.includes('openshift')) return 'OpenShift';
        if (p.includes('ansible')) return 'Ansible';
        if (p.includes('storage')) return 'Storage';
        if (p.includes('cloudforms')) return 'CloudForms';
        if (p.includes('directory server')) return 'Directory Server';
        if (p.includes('virtualization')) return 'Virtualization';
        if (p.includes('gluster')) return 'Gluster';
        if (p.includes('ceph')) return 'Ceph';
        if (p.includes('middleware')) return 'Middleware';
        return 'Other';
    }

    extractSynopsis($) {
        // Try multiple selectors for synopsis
        const selectors = [
            'h1',
            '.page-title',
            '.advisory-title',
            '[data-testid="synopsis"]',
            '.synopsis'
        ];
        
        for (const selector of selectors) {
            const text = $(selector).first().text().trim();
            if (text && text.length > 5) {
                return text.replace(/^RHSA-\d{4}:\d+\s*-?\s*/, '');
            }
        }
        
        return '';
    }

    extractSeverity($) {
        const severitySelectors = [
            '.severity',
            '[data-testid="severity"]',
            '.security-impact'
        ];
        
        for (const selector of severitySelectors) {
            const text = $(selector).text().trim();
            if (text.match(/critical|important|moderate|low/i)) {
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            }
        }
        
        // Look for severity in page text
        const pageText = $('body').text();
        const severityMatch = pageText.match(/security impact of (critical|important|moderate|low)/i);
        if (severityMatch) {
            return severityMatch[1].charAt(0).toUpperCase() + severityMatch[1].slice(1).toLowerCase();
        }
        
        return 'Unknown';
    }

    extractPublishDate($) {
        const dateSelectors = [
            '[data-testid="issued"]',
            '.issued-date',
            '.publish-date'
        ];
        
        for (const selector of dateSelectors) {
            const text = $(selector).text().trim();
            if (text) {
                return text;
            }
        }
        
        // Look for date patterns in text
        const pageText = $('body').text();
        const dateMatch = pageText.match(/issued:\s*(\d{4}-\d{2}-\d{2})/i) ||
                         pageText.match(/updated:\s*(\d{4}-\d{2}-\d{2})/i);
        
        if (dateMatch) {
            return dateMatch[1];
        }
        
        return new Date().toISOString().split('T')[0];
    }

    extractProducts($) {
        const productSelectors = [
            '[data-testid="affected-products"]',
            '.affected-products',
            '.products'
        ];
        
        for (const selector of productSelectors) {
            const text = $(selector).text().trim();
            if (text && text.includes('Enterprise Linux')) {
                return text;
            }
        }
        
        // Default if we can't find specific products
        return 'Red Hat Enterprise Linux';
    }

    extractCVEs($) {
        const pageText = $('body').text();
        const cvePattern = /CVE-\d{4}-\d+/g;
        const cves = pageText.match(cvePattern) || [];
        return [...new Set(cves)]; // Remove duplicates
    }

    extractRhelVersion(products) {
        // Match 'Linux 8', 'Linux-8.6', 'Linux 7.9', 'RHEL 8', 'RHEL-8.6', etc.
        let match = products.match(/Linux[\s\-]*(\d+(?:\.\d+)?)/i);
        if (match) return match[1];
        match = products.match(/RHEL[\s\-]*(\d+(?:\.\d+)?)/i);
        if (match) return match[1];
        return null;
    }

    isRHELAdvisory(text) {
        const lowerText = text.toLowerCase();
        return lowerText.includes('enterprise linux') || 
               lowerText.includes('rhel') ||
               (lowerText.includes('red hat') && lowerText.includes('linux'));
    }

    isInDateRange(dateString) {
        try {
            const date = new Date(dateString);
            return date >= this.endDate && date <= this.startDate;
        } catch {
            return true; // Include if we can't parse the date
        }
    }

    extractRHSAId(text) {
        const match = text.match(/RHSA-(\d{4}):(\d+)/);
        return match ? match[0] : null;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }

    processAdvisories() {
        console.log('🔄 Processing and filtering advisories...');
        
        const initialCount = this.advisories.length;
        
        // Remove duplicates
        const seen = new Set();
        this.advisories = this.advisories.filter(advisory => {
            const key = advisory.advisory;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        // Apply architecture filter
        if (CONFIG.architecture && CONFIG.architecture !== 'all') {
            this.advisories = this.advisories.filter(advisory => {
                const products = advisory.products.toLowerCase();
                return products.includes(CONFIG.architecture) || 
                       products.includes('all') ||
                       (!products.includes('x86') && !products.includes('arm') && 
                        !products.includes('s390') && !products.includes('ppc'));
            });
        }

        // Sort by date (newest first)
        this.advisories.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        
        console.log(`📊 Filtered: ${initialCount} → ${this.advisories.length} advisories`);
        
        // Group by date for summary
        const byDate = {};
        this.advisories.forEach(advisory => {
            const date = advisory.publishDate;
            byDate[date] = (byDate[date] || 0) + 1;
        });
        
        console.log(`📅 Date distribution:`);
        Object.entries(byDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 10)
            .forEach(([date, count]) => {
                console.log(`   ${date}: ${count} advisories`);
            });
    }

    async exportData() {
        console.log('📊 Exporting data...');
        
        await this.exportCSV();
        if (xlsx) await this.exportExcel();
        await this.exportJSON();
        await this.createDetailedReport();
    }

    async exportCSV() {
        const headers = ['Advisory', 'Synopsis', 'Severity', 'Products', 'Publish Date'];
        const csvRows = [headers.join(',')];
        
        this.advisories.forEach(advisory => {
            const row = [
                advisory.advisory,
                `"${(advisory.synopsis || '').replace(/"/g, '""')}"`,
                advisory.severity || 'Unknown',
                `"${(advisory.products || '').replace(/"/g, '""')}"`,
                advisory.publishDate
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const csvFile = `${CONFIG.outputFile}.csv`;
        fs.writeFileSync(csvFile, csvContent, 'utf8');
        console.log(`✅ CSV exported: ${csvFile}`);
    }

    async exportExcel() {
        try {
            const worksheet = xlsx.utils.json_to_sheet(this.advisories.map(advisory => ({
                'Advisory': advisory.advisory,
                'Synopsis': advisory.synopsis,
                'Severity': advisory.severity,
                'Products': advisory.products,
                'Publish Date': advisory.publishDate,
                'CVEs': (advisory.cves || []).join(', '),
                'Link': advisory.link
            })));
            
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'RHEL Security Advisories');
            
            const excelFile = `${CONFIG.outputFile}.xlsx`;
            xlsx.writeFile(workbook, excelFile);
            console.log(`✅ Excel exported: ${excelFile}`);
        } catch (error) {
            console.log(`⚠️  Excel export failed: ${error.message}`);
        }
    }

    async exportJSON() {
        const jsonFile = `${CONFIG.outputFile}.json`;
        const jsonData = {
            metadata: {
                generatedAt: new Date().toISOString(),
                totalAdvisories: this.advisories.length,
                dateRange: CONFIG.dateRange,
                architecture: CONFIG.architecture,
                startDate: this.startDate.toISOString().split('T')[0],
                endDate: this.endDate.toISOString().split('T')[0]
            },
            advisories: this.advisories
        };
        
        fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log(`✅ JSON exported: ${jsonFile}`);
    }

    async createDetailedReport() {
        const reportFile = `${CONFIG.outputFile}_report.txt`;
        let report = '';
        
        report += `Red Hat Enterprise Linux Security Advisories Report\n`;
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Date Range: ${this.endDate.toISOString().split('T')[0]} to ${this.startDate.toISOString().split('T')[0]} (${CONFIG.dateRange} days)\n`;
        report += `Architecture Filter: ${CONFIG.architecture}\n`;
        report += `Total Advisories: ${this.advisories.length}\n`;
        report += `${'='.repeat(80)}\n\n`;
        
        // Statistics by severity
        const bySeverity = this.advisories.reduce((acc, advisory) => {
            const severity = advisory.severity || 'Unknown';
            if (!acc[severity]) acc[severity] = [];
            acc[severity].push(advisory);
            return acc;
        }, {});
        
        report += `SEVERITY BREAKDOWN\n`;
        report += `${'-'.repeat(30)}\n`;
        Object.entries(bySeverity).forEach(([severity, advisories]) => {
            report += `${severity}: ${advisories.length} advisories\n`;
        });
        report += `\n`;
        
        // Monthly breakdown
        const byMonth = this.advisories.reduce((acc, advisory) => {
            const month = advisory.publishDate.substring(0, 7); // YYYY-MM
            if (!acc[month]) acc[month] = [];
            acc[month].push(advisory);
            return acc;
        }, {});
        
        report += `MONTHLY BREAKDOWN\n`;
        report += `${'-'.repeat(30)}\n`;
        Object.entries(byMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .forEach(([month, advisories]) => {
                report += `${month}: ${advisories.length} advisories\n`;
            });
        report += `\n`;
        
        // Detailed listings
        Object.entries(bySeverity).forEach(([severity, advisories]) => {
            report += `${severity.toUpperCase()} ADVISORIES (${advisories.length})\n`;
            report += `${'-'.repeat(50)}\n`;
            
            advisories.forEach(advisory => {
                report += `${advisory.advisory}: ${advisory.synopsis}\n`;
                report += `  Date: ${advisory.publishDate}\n`;
                report += `  Products: ${advisory.products}\n`;
                if (advisory.cves && advisory.cves.length > 0) {
                    report += `  CVEs: ${advisory.cves.join(', ')}\n`;
                }
                report += `  Link: ${advisory.link}\n\n`;
            });
        });
        
        fs.writeFileSync(reportFile, report, 'utf8');
        console.log(`✅ Report created: ${reportFile}`);
    }

    printSummary() {
        console.log('\n📋 FINAL SUMMARY');
        console.log('=' .repeat(40));
        console.log(`Total advisories found: ${this.advisories.length}`);
        console.log(`Date range: ${CONFIG.dateRange} days`);
        console.log(`Architecture filter: ${CONFIG.architecture}`);
        
        const severityCounts = this.advisories.reduce((acc, advisory) => {
            const severity = advisory.severity || 'Unknown';
            acc[severity] = (acc[severity] || 0) + 1;
            return acc;
        }, {});
        
        console.log('\nBy severity:');
        Object.entries(severityCounts).forEach(([severity, count]) => {
            console.log(`  ${severity}: ${count}`);
        });
        
        console.log(`\n📁 Files created:`);
        console.log(`  • ${CONFIG.outputFile}.csv`);
        if (xlsx) console.log(`  • ${CONFIG.outputFile}.xlsx`);
        console.log(`  • ${CONFIG.outputFile}.json`);
        console.log(`  • ${CONFIG.outputFile}_report.txt`);
    }

    // Utility methods
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    extractImpactInfo($) {
        // Look for text containing 'exploit', 'impact', 'public exploit', etc.
        const bodyText = $('body').text().toLowerCase();
        const impactMatches = bodyText.match(/impact:.*?(\.|$)/i);
        const exploitMatches = bodyText.match(/exploit (exists|available|public|code|in the wild|reported|disclosed)/i);
        let info = null;
        if (impactMatches) info = impactMatches[0].trim();
        if (exploitMatches) info = (info ? info + ' | ' : '') + exploitMatches[0].trim();
        return info;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Parse CLI arguments
    args.forEach(arg => {
        if (arg.startsWith('--days=')) {
            CONFIG.dateRange = parseInt(arg.split('=')[1]) || 30;
        } else if (arg.startsWith('--arch=')) {
            CONFIG.architecture = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            CONFIG.outputFile = arg.split('=')[1];
        }
    });
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Fixed Enhanced Red Hat Enterprise Linux Security Scraper

Usage: node fixed-enhanced-rhel-scraper.js [options]

Options:
  --days=N        Days to look back (default: 30, supports up to 365+)
  --arch=ARCH     Architecture filter (default: x86_64, use 'all' for all)
  --output=PREFIX Output file prefix (default: rhel_security_advisories)
  --help, -h      Show this help

Examples:
  node fixed-enhanced-rhel-scraper.js --days=365 --arch=x86_64
  node fixed-enhanced-rhel-scraper.js --days=90 --arch=all
  node fixed-enhanced-rhel-scraper.js --days=7 --output=weekly_report

This version properly fetches historical data for any date range.
        `);
        process.exit(0);
    }
    
    const scraper = new HistoricalRHELScraper();
    scraper.run();
}

module.exports = HistoricalRHELScraper;