import warnings

# Suppress warnings from pdfplumber
warnings.filterwarnings("ignore", category=UserWarning)

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import paramiko
import pdfplumber
import pdfkit

# Function to read and parse the CIS benchmark from the PDF file
def parse_cis_benchmark(pdf_path):
    """
    Reads and parses the CIS benchmark rules from the given PDF file.
    :param pdf_path: Path to the CIS Benchmark PDF file
    :return: List of benchmark rules
    """
    benchmark_rules = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                for line in text.split('\n'):
                    if "Ensure" in line:
                        benchmark_rules.append(line.strip())
        return benchmark_rules
    except Exception as e:
        return {"Error": str(e)}

# Function to validate server settings against the parsed CIS benchmark rules
def validate_cis_compliance(ip, username, password, benchmark_rules):
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(ip, username=username, password=password)

        compliance_results = []
        for rule in benchmark_rules:
            if ":" in rule:
                setting, expected = rule.split(":", 1)
                command = f"grep '{setting}' /etc/*"
                stdin, stdout, stderr = ssh.exec_command(command)
                current_value = stdout.read().decode('utf-8').strip()
                compliance_results.append({
                    "Setting": setting,
                    "Expected": expected.strip(),
                    "Current": current_value,
                    "Compliant": current_value == expected.strip()
                })

        ssh.close()
        return compliance_results
    except Exception as e:
        return {"Error": str(e)}

# Function to generate and display compliance report
def generate_compliance_report():
    ip = ip_entry.get()
    username = username_entry.get()
    password = password_entry.get()

    if not ip or not username or not password:
        messagebox.showerror("Error", "Please fill in all fields!")
        return

    pdf_path = r"C:\Users\LENOVO\source\repos\AI\CIS_Red_Hat_Enterprise_Linux_8_Benchmark_v3.0.0.pdf"
    benchmark_rules = parse_cis_benchmark(pdf_path)
    if "Error" in benchmark_rules:
        messagebox.showerror("Error", benchmark_rules["Error"])
        return

    results = validate_cis_compliance(ip, username, password, benchmark_rules)
    if "Error" in results:
        messagebox.showerror("Error", results["Error"])
        return

    compliant_count = sum(1 for r in results if r["Compliant"])
    non_compliant_count = sum(1 for r in results if not r["Compliant"])

    generate_html_report(ip, compliant_count, non_compliant_count, results)

# Function to generate the HTML report
def generate_html_report(hostname, compliant_count, non_compliant_count, results):
    search_term = search_entry.get().lower()
    filtered_results = []

    # Filter results based on the search term
    if search_term:
        if "non" in search_term:
            filtered_results = [r for r in results if not r["Compliant"]]
        elif "comp" in search_term:
            filtered_results = [r for r in results if r["Compliant"]]
    else:
        filtered_results = results

    html_content = f"""
    <html>
    <head>
        <title>Compliance Report</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
            }}
            .summary {{
                font-size: 18px;
                margin-bottom: 20px;
            }}
            .compliant {{
                background-color: #d0f0fd; /* Light Blue */
            }}
            .non-compliant {{
                background-color: #ffd6d6; /* Red */
            }}
            .summary-compliant {{
                color: #007bff; /* Blue */
            }}
            .summary-non-compliant {{
                color: #dc3545; /* Red */
            }}
        </style>
    </head>
    <body>
        <h1>Compliance Report for {hostname}</h1>
        <div class="summary">
            <p><b>Compliant:</b> <span class="summary-compliant">{compliant_count}</span></p>
            <p><b>Non-Compliant:</b> <span class="summary-non-compliant">{non_compliant_count}</span></p>
        </div>
        <div>
            <input type="text" id="search" placeholder="Type 'non' or 'comp' to filter results">
            <button onclick="filterResults()">Search</button>
        </div>
        <table border="1" cellpadding="5" cellspacing="0">
            <tr>
                <th>Setting</th>
                <th>Expected</th>
                <th>Current</th>
                <th>Status</th>
            </tr>
    """
    for result in filtered_results:
        status = "Compliant" if result["Compliant"] else "Non-Compliant"
        row_class = "compliant" if result["Compliant"] else "non-compliant"
        html_content += f"""
            <tr class="{row_class}">
                <td>{result['Setting']}</td>
                <td>{result['Expected']}</td>
                <td>{result['Current']}</td>
                <td>{status}</td>
            </tr>
        """
    html_content += """
        </table>
    </body>
    </html>
    """

    with open("compliance_report.html", "w") as file:
        file.write(html_content)

    messagebox.showinfo("Success", "Compliance report generated successfully!")
    save_as_pdf_option(html_content)

def save_as_pdf_option(html_content):
    save_path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF files", "*.pdf"), ("HTML files", "*.html")])
    if save_path:
        if save_path.endswith(".pdf"):
            pdfkit.from_string(html_content, save_path)
        elif save_path.endswith(".html"):
            with open(save_path, "w") as file:
                file.write(html_content)

# GUI Setup
root = tk.Tk()
root.title("Server Health and Compliance Check")
root.geometry("600x550")

# IP Address Field
tk.Label(root, text="IP Address:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
ip_entry = tk.Entry(root, width=30)
ip_entry.grid(row=0, column=1, padx=10, pady=5)

# Username Field
tk.Label(root, text="Username:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
username_entry = tk.Entry(root, width=30)
username_entry.grid(row=1, column=1, padx=10, pady=5)

# Password Field
tk.Label(root, text="Password:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
password_entry = tk.Entry(root, show="*", width=30)
password_entry.grid(row=2, column=1, padx=10, pady=5)

# Search Field
tk.Label(root, text="Filter Results:").grid(row=3, column=0, padx=10, pady=5, sticky="e")
search_entry = tk.Entry(root, width=30)
search_entry.grid(row=3, column=1, padx=10, pady=5)

# Compliance Button
compliance_button = tk.Button(root, text="Run Compliance Check", command=generate_compliance_report, width=25)
compliance_button.grid(row=4, column=0, columnspan=2, pady=10)

# Run the GUI
root.mainloop()