const axios = require('axios');
const Table = require('cli-table3');

// NOTE: Insert your Red Hat API credentials below
const CLIENT_ID = 'YOUR_CLIENT_ID'; // <-- Replace with your Red Hat API Client ID
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'; // <-- Replace with your Red Hat API Client Secret

const getAdvisories = async () => {
  try {
    const response = await axios.get('https://api.access.redhat.com/security/data/advisories', {
      params: {
        from: '2019-01-01', // Start date (in YYYY-MM-DD format)
        to: '2021-12-31' // End date (in YYYY-MM-DD format)
      },
      headers: {
        'Client-Id': CLIENT_ID, // Insert your credentials here
        'Client-Secret': CLIENT_SECRET
      }
    });

    const advisories = response.data;
    const table = new Table({
      head: ['ID', 'Title', 'Product', 'Version', 'CVEs'],
      colWidths: [10, 40, 20, 20, 20]
    });

    advisories.forEach(advisory => {
      const cves = advisory.cve ? advisory.cve.map(cve => `CVE-${cve}`).join(', ') : 'None';
      table.push([
        advisory.id,
        advisory.title,
        advisory.product,
        advisory.version,
        cves
      ]);
    });

    console.log(table.toString());
  } catch (error) {
    console.error(`Error fetching advisories: ${error}`);
  }
};

const getEOLEOSL = async () => {
  try {
    const response = await axios.get('https://api.access.redhat.com/security/data/metrics/product-eol-eosl', {
      params: {
        product: 'RHEL', // Replace with the specific product if needed
        metrics: 'eol,eosl'
      },
      headers: {
        'Client-Id': CLIENT_ID, // Insert your credentials here
        'Client-Secret': CLIENT_SECRET
      }
    });

    console.log('EOL/EOSL Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(`Error fetching EOL/EOSL data: ${error}`);
  }
};

// Run both fetches
getAdvisories();
getEOLEOSL(); 