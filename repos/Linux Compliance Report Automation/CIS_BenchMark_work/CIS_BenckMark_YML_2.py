import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox
import pdfplumber  # For extracting text from text-based PDFs
from PIL import Image  # For handling images in PDFs
from pdf2image import convert_from_path  # For converting PDF pages to images
import pytesseract  # For OCR

# Function to log messages to the GUI
def log_message(log_widget, message):
    log_widget.insert(tk.END, message + "\n")
    log_widget.see(tk.END)  # Automatically scroll to the end

# Function to extract text from a PDF file (with OCR fallback)
def extract_text_from_pdf(pdf_path, log_widget):
    try:
        log_message(log_widget, f"Processing PDF: {pdf_path}")
        # Try extracting text with pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
            if text.strip():  # If text is successfully extracted
                log_message(log_widget, "Text successfully extracted using pdfplumber.")
                return text
    except Exception as e:
        log_message(log_widget, f"Error reading PDF with pdfplumber: {e}")

    # Fallback to OCR if pdfplumber fails or extracts no text
    try:
        log_message(log_widget, "Falling back to OCR...")
        ocr_text = ""
        images = convert_from_path(pdf_path)  # Convert PDF pages to images
        for image in images:
            ocr_text += pytesseract.image_to_string(image)
        log_message(log_widget, "Text successfully extracted using OCR.")
        return ocr_text
    except Exception as e:
        log_message(log_widget, f"Error during OCR process: {e}")
        return None

# Function to parse CIS Benchmark points and Audit commands
def parse_cis_benchmarks(pdf_text, log_widget):
    log_message(log_widget, "Parsing CIS Benchmarks from extracted text...")
    benchmarks = []
    lines = pdf_text.split("\n")
    current_point = None
    audit_command = None

    for line in lines:
        # Match CIS Benchmark points (e.g., "2.3.3 Ensure nis client is not installed (Automated)")
        point_match = re.match(r"^\d+\.\d+\.\d+.*Ensure.*", line.strip())
        if point_match:
            if current_point and audit_command:
                benchmarks.append((current_point, audit_command))
            current_point = line.strip()
            audit_command = None  # Reset audit command for the next point

        # Match Audit commands
        elif line.strip().startswith("Audit:"):
            audit_command = line.strip().replace("Audit:", "").strip()

    # Add the last benchmark if it exists
    if current_point and audit_command:
        benchmarks.append((current_point, audit_command))

    log_message(log_widget, f"Found {len(benchmarks)} benchmarks.")
    return benchmarks

# Function to generate Ansible YAML from parsed benchmarks
def generate_ansible_yaml(benchmarks, output_path, log_widget):
    try:
        log_message(log_widget, f"Generating YAML file: {output_path}")
        yaml_content = []
        for point, audit_command in benchmarks:
            yaml_snippet = f"""\
- name: {point}
  hosts: all
  tasks:
    - name: Check compliance for {point}
      shell: {audit_command}
      register: audit_output

    - name: Ensure compliance with {point}
      debug:
        msg: |
          Compliance Output: {{{{ audit_output.stdout }}}}
"""
            yaml_content.append(yaml_snippet)

        # Save YAML output
        with open(output_path, 'w') as yaml_file:
            yaml_file.writelines(yaml_content)

        log_message(log_widget, f"YAML file saved successfully: {output_path}")
        return output_path
    except Exception as e:
        log_message(log_widget, f"Error generating YAML: {e}")
        return None

# Function to handle file selection and conversion
def select_and_convert_files(log_widget):
    file_paths = filedialog.askopenfilenames(title="Select CIS Benchmark PDF Files", filetypes=[("PDF Files", "*.pdf")])
    if not file_paths:
        log_message(log_widget, "No files selected.")
        return

    success_files = []
    for pdf_path in file_paths:
        # Extract text from PDF (with OCR fallback)
        pdf_text = extract_text_from_pdf(pdf_path, log_widget)
        if not pdf_text:
            log_message(log_widget, f"Failed to extract text from {pdf_path}. Skipping.")
            continue

        # Parse benchmarks and audit commands
        benchmarks = parse_cis_benchmarks(pdf_text, log_widget)
        if not benchmarks:
            log_message(log_widget, f"No benchmarks found in {pdf_path}")
            continue

        # Generate YAML output
        output_path = os.path.splitext(pdf_path)[0] + ".yml"
        generated_path = generate_ansible_yaml(benchmarks, output_path, log_widget)
        if generated_path:
            success_files.append(generated_path)

    if success_files:
        messagebox.showinfo("Success", f"Converted {len(success_files)} files successfully!\nOutput saved as YAML.")
        log_message(log_widget, f"Converted {len(success_files)} files successfully.")
    else:
        messagebox.showerror("Error", "No files were converted.")
        log_message(log_widget, "No files were converted.")

# Main GUI setup
def main():
    root = tk.Tk()
    root.title("CIS Benchmark to Ansible YAML Converter")

    # Window size
    root.geometry("600x400")

    # Instruction label
    label = tk.Label(root, text="Select CIS Benchmark PDF files to convert to Ansible YAML.", wraplength=400, justify="center")
    label.pack(pady=10)

    # File selection button
    select_button = tk.Button(root, text="Select Files", command=lambda: select_and_convert_files(log_widget))
    select_button.pack(pady=10)

    # Log viewer (Text widget)
    log_widget = tk.Text(root, height=15, width=70, state=tk.NORMAL)
    log_widget.pack(pady=10)

    # Exit button
    exit_button = tk.Button(root, text="Exit", command=root.quit)
    exit_button.pack(pady=10)

    root.mainloop()

if __name__ == "__main__":
    main()