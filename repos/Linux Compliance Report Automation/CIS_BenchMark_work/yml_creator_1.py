import tkinter as tk
from tkinter import filedialog, messagebox
import pdfplumber
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

# Function to generate an Ansible playbook from the parsed rules
def generate_ansible_playbook(rules, output_path):
    """
    Generates an Ansible playbook from the given CIS benchmark rules.
    :param rules: List of CIS benchmark rules
    :param output_path: Path to save the Ansible playbook
    """
    try:
        with open(output_path, 'w') as playbook_file:
            playbook_file.write("---\n")
            playbook_file.write("# Ansible Playbook for CIS Benchmark\n")
            playbook_file.write("- name: Apply CIS Benchmark Rules\n")
            playbook_file.write("  hosts: all\n")
            playbook_file.write("  tasks:\n")
            for i, rule in enumerate(rules, start=1):
                playbook_file.write(f"    - name: {rule}\n")
                playbook_file.write(f"      command: echo 'Implement {rule}'\n")
        messagebox.showinfo("Success", f"Ansible playbook saved to {output_path}")
    except Exception as e:
        messagebox.showerror("Error", f"Failed to generate playbook: {e}")

# Function to handle file selection and processing
def select_and_process_pdf():
    """
    Opens a file dialog to select a PDF, parses the CIS benchmark, and generates an Ansible playbook.
    """
    pdf_path = filedialog.askopenfilename(
        filetypes=[("PDF files", "*.pdf")],
        title="Select CIS Benchmark PDF"
    )
    if not pdf_path:
        return

    # Parse the CIS benchmark
    rules = parse_cis_benchmark(pdf_path)
    if isinstance(rules, dict) and "Error" in rules:
        messagebox.showerror("Error", f"Failed to parse PDF: {rules['Error']}")
        return

    # Save the Ansible playbook
    output_path = filedialog.asksaveasfilename(
        defaultextension=".yml",
        filetypes=[("YAML files", "*.yml")],
        title="Save Ansible Playbook"
    )
    if not output_path:
        return

    generate_ansible_playbook(rules, output_path)

# Create the GUI
def create_gui():
    """
    Creates the main GUI for the application.
    """
    root = tk.Tk()
    root.title("CIS Benchmark to Ansible Playbook")
    root.geometry("400x200")

    # Add a button to select and process the PDF
    process_button = tk.Button(
        root,
        text="Select CIS Benchmark PDF",
        command=select_and_process_pdf,
        width=30,
        height=2
    )
    process_button.pack(pady=50)

    # Run the GUI event loop
    root.mainloop()

if __name__ == "__main__":
    create_gui()
