import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import pdfplumber
import jinja2

# Function to parse CIS benchmark from a PDF file
def parse_cis_benchmark(pdf_path):
    """
    Extracts benchmark rules from the given CIS Benchmark PDF file.
    """
    benchmark_rules = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                for line in text.split('\n'):
                    if "Ensure" in line and "Audit:" in text:  # Match "Ensure" rules with "Audit" commands
                        benchmark_rules.append(line.strip())
        return benchmark_rules
    except Exception as e:
        return {"Error": str(e)}

# Function to generate Ansible YAML from benchmark rules
def generate_ansible_yaml(benchmark_rules, output_dir):
    """
    Converts benchmark rules into Ansible YAML tasks.
    """
    yaml_lines = []
    for rule in benchmark_rules:
        if "Audit:" in rule:
            parts = rule.split("Audit:")
            description = parts[0].strip()
            command = parts[1].strip()
            yaml_task = f"""
- name: {description}
  hosts: all
  tasks:
    - name: Run audit command for {description}
      shell: {command}
      register: audit_output

    - name: Check compliance for {description}
      debug:
        msg: "Compliance Output: {{ audit_output.stdout }}"
"""
            yaml_lines.append(yaml_task)

    # Write to YAML file
    yaml_file = os.path.join(output_dir, "benchmark_tasks.yml")
    with open(yaml_file, "w") as file:
        file.writelines(yaml_lines)

    return yaml_file

# Function to generate Jinja2 template
def generate_jinja_template(output_dir):
    """
    Creates a Jinja2 report template.
    """
    jinja_template = """
    <html>
    <head>
        <title>Compliance Report</title>
    </head>
    <body>
        <h1>Compliance Report</h1>
        <table border="1">
            <thead>
                <tr>
                    <th>Setting</th>
                    <th>Expected</th>
                    <th>Current</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {% for result in results %}
                <tr>
                    <td>{{ result.setting }}</td>
                    <td>{{ result.expected }}</td>
                    <td>{{ result.current }}</td>
                    <td>{{ "Compliant" if result.compliant else "Non-Compliant" }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </body>
    </html>
    """
    jinja_file = os.path.join(output_dir, "report_template.j2")
    with open(jinja_file, "w") as file:
        file.write(jinja_template)

    return jinja_file

# Function to handle file selection and YAML/Jinja2 generation
def process_benchmarks():
    """
    Parse CIS Benchmarks, generate Ansible YAML, and create Jinja2 templates.
    """
    file_paths = filedialog.askopenfilenames(title="Select CIS Benchmark PDF Files", filetypes=[("PDF Files", "*.pdf")])
    if not file_paths:
        messagebox.showerror("Error", "No files selected!")
        return

    output_dir = filedialog.askdirectory(title="Select Output Directory")
    if not output_dir:
        messagebox.showerror("Error", "No output directory selected!")
        return

    for pdf_path in file_paths:
        # Parse the benchmark
        benchmark_rules = parse_cis_benchmark(pdf_path)
        if "Error" in benchmark_rules:
            messagebox.showerror("Error", f"Error parsing {pdf_path}: {benchmark_rules['Error']}")
            continue

        # Generate YAML and Jinja2 templates
        yaml_file = generate_ansible_yaml(benchmark_rules, output_dir)
        jinja_file = generate_jinja_template(output_dir)

        messagebox.showinfo("Success", f"Generated YAML: {yaml_file}\nGenerated Jinja2 Template: {jinja_file}")

# GUI Setup
def main():
    root = tk.Tk()
    root.title("CIS Benchmark Processor")
    root.geometry("600x400")

    # Tabs
    tab_control = ttk.Notebook(root)
    tab1 = ttk.Frame(tab_control)
    tab2 = ttk.Frame(tab_control)

    tab_control.add(tab1, text="Select CIS Benchmarks")
    tab_control.add(tab2, text="Run Compliance Check")
    tab_control.pack(expand=1, fill="both")

    # Tab 1: Select CIS Benchmarks
    ttk.Label(tab1, text="Select CIS Benchmark PDF files and generate Ansible YAML:").pack(pady=10)
    select_button = ttk.Button(tab1, text="Select and Process Benchmarks", command=process_benchmarks)
    select_button.pack(pady=20)

    # Tab 2: Run Compliance Check
    ttk.Label(tab2, text="Run compliance check using generated Ansible YAML:").pack(pady=10)
    ttk.Label(tab2, text="(This feature will require integration with Ansible runtime)").pack(pady=5)

    root.mainloop()

if __name__ == "__main__":
    main()
