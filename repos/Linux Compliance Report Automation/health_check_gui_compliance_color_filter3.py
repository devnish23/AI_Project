import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import paramiko
import pdfplumber
import pdfkit
import warnings

# Suppress warnings from pdfplumber
warnings.filterwarnings("ignore", category=UserWarning)
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
                    if "Ensure" in line:  # Example: Identify rules starting with "Ensure"
                        benchmark_rules.append(line.strip())
        return benchmark_rules
    except Exception as e:
        return {"Error": str(e)}

# Function to validate server settings against the parsed CIS benchmark rules
def validate_cis_compliance(ip, username, password, benchmark_rules):
    """
    Validates server settings against CIS benchmarks and generates a compliance report.
    :param ip: Server IP address
    :param username: SSH username
    :param password: SSH password
    :param benchmark_rules: Parsed CIS benchmark rules
    :return: Compliance results and summary
    """
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(ip, username=username, password=password)

        compliance_results = []
        for rule in benchmark_rules:
            if ":" in rule:
                setting, expected = rule.split(":", 1)
                command = f"grep '{setting}' /etc/*"  # Example command
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
    """
    Generates a compliance report in HTML format and provides options to save it.
    """
    ip = ip_entry.get()
    username = username_entry.get()
    password = password_entry.get()

    if not ip or not username or not password:
        messagebox.showerror("Error", "Please fill in all fields!")
        return

    # Parse CIS benchmark from the PDF file
    pdf_path = r"C:\Users\LENOVO\source\repos\AI\CIS_Red_Hat_Enterprise_Linux_8_Benchmark_v3.0.0.pdf"
    benchmark_rules = parse_cis_benchmark(pdf_path)
    if "Error" in benchmark_rules:
        messagebox.showerror("Error", benchmark_rules["Error"])
        return

    # Validate compliance
    results = validate_cis_compliance(ip, username, password, benchmark_rules)
    if "Error" in results:
        messagebox.showerror("Error", results["Error"])
        return

    # Count compliance and non-compliance
    compliant_count = sum(1 for r in results if r["Compliant"])
    non_compliant_count = sum(1 for r in results if not r["Compliant"])

    # Generate HTML content
    generate_html_report(ip, compliant_count, non_compliant_count, results)

# Function to generate the HTML report
def generate_html_report(hostname, compliant_count, non_compliant_count, results):
    """
    Generates an HTML report with sorting, filtering, and export options.
    """
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
            .filter-input {{
                width: 100%;
                padding: 5px;
                box-sizing: border-box;
            }}
            th {{
                cursor: pointer;
            }}
        </style>
        <script>
            function filterColumn(columnIndex) {{
                var input = document.getElementById("filter-" + columnIndex).value.toLowerCase();
                var table = document.getElementById("compliance-table");
                var rows = table.getElementsByTagName("tr");

                for (var i = 1; i < rows.length; i++) {{
                    var cell = rows[i].getElementsByTagName("td")[columnIndex];
                    if (cell) {{
                        var textValue = cell.textContent || cell.innerText;
                        if (textValue.toLowerCase().indexOf(input) > -1) {{
                            rows[i].style.display = "";
                        }} else {{
                            rows[i].style.display = "none";
                        }}
                    }}
                }}
            }}

            function sortTable(columnIndex) {{
                var table = document.getElementById("compliance-table");
                var rows = Array.from(table.getElementsByTagName("tr")).slice(1); // Exclude header row
                var ascending = table.getAttribute("data-sort-asc-" + columnIndex) === "true";

                rows.sort(function(rowA, rowB) {{
                    var cellA = rowA.getElementsByTagName("td")[columnIndex].textContent.toLowerCase();
                    var cellB = rowB.getElementsByTagName("td")[columnIndex].textContent.toLowerCase();
                    if (cellA < cellB) return ascending ? -1 : 1;
                    if (cellA > cellB) return ascending ? 1 : -1;
                    return 0;
                }});

                // Toggle sort direction
                table.setAttribute("data-sort-asc-" + columnIndex, !ascending);

                // Reattach sorted rows
                var tbody = table.getElementsByTagName("tbody")[0];
                rows.forEach(function(row) {{
                    tbody.appendChild(row);
                }});
            }}

            function exportTo(format) {{
                if (format === "pdf") {{
                    window.print(); // Simple print functionality for PDF export
                }} else if (format === "html") {{
                    var element = document.createElement("a");
                    element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(document.documentElement.outerHTML));
                    element.setAttribute("download", "compliance_report.html");
                    element.click();
                }}
            }}
        </script>
    </head>
    <body>
        <h1>Compliance Report for {hostname}</h1>
        <div class="summary">
            <p><b>Compliant:</b> <span class="summary-compliant">{compliant_count}</span></p>
            <p><b>Non-Compliant:</b> <span class="summary-non-compliant">{non_compliant_count}</span></p>
        </div>
        <div class="export-buttons">
            <button onclick="exportTo('pdf')">Export as PDF</button>
            <button onclick="exportTo('html')">Download as HTML</button>
        </div>
        <table id="compliance-table" border="1" cellpadding="5" cellspacing="0">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Setting<br><input type="text" id="filter-0" class="filter-input" onkeyup="filterColumn(0)" placeholder="Search Setting"></th>
                    <th onclick="sortTable(1)">Expected<br><input type="text" id="filter-1" class="filter-input" onkeyup="filterColumn(1)" placeholder="Search Expected"></th>
                    <th onclick="sortTable(2)">Current<br><input type="text" id="filter-2" class="filter-input" onkeyup="filterColumn(2)" placeholder="Search Current"></th>
                    <th onclick="sortTable(3)">Status<br><input type="text" id="filter-3" class="filter-input" onkeyup="filterColumn(3)" placeholder="Search Status"></th>
                </tr>
            </thead>
            <tbody>
    """
    for result in results:
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
            </tbody>
        </table>
    </body>
    </html>
    """

    with open("compliance_report.html", "w") as file:
        file.write(html_content)

    messagebox.showinfo("Success", "Compliance report generated successfully!")
    save_as_pdf_option(html_content)

def save_as_pdf_option(html_content):
    """
    Save the generated HTML report as a PDF file.
    """
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

# Compliance Button
compliance_button = tk.Button(root, text="Run Compliance Check", command=generate_compliance_report, width=25)
compliance_button.grid(row=3, column=0, columnspan=2, pady=10)

# Run the GUI
root.mainloop()