# CIS Compliance Checker

This script performs compliance checks against the Center for Internet Security (CIS) benchmarks and generates HTML reports.

## Features

- Firewall configuration checks
- SSH configuration validation
- Password policy verification
- HTML report generation

## Requirements

- Python 3.6+
- Required Python packages (install using `pip install -r requirements.txt`):
  - python-nmap
  - beautifulsoup4
  - lxml

## Usage

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the compliance checker:
```bash
python cis_compliance_checker.py <target_host>
```

Example:
```bash
python cis_compliance_checker.py 192.168.1.1
```

The script will generate an HTML report named `cis_compliance_report_[hostname]_[timestamp].html` in the current directory.
