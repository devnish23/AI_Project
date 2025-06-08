import os
import tkinter as tk
from tkinter import filedialog, messagebox
import PyPDF2
import yaml

def upload_pdf():
    # Open file dialog to select a PDF file
    file_path = filedialog.askopenfilename(
        filetypes=[("PDF files", "*.pdf")],
        title="Select CIS Benchmark PDF"
    )
    if file_path:
        process_pdf(file_path)

def process_pdf(file_path):
    try:
        # Extract text from the PDF
        with open(file_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text()

        # Parse the text and generate YAML files
        generate_yaml_files(pdf_text)
        messagebox.showinfo("Success", "YAML files created successfully!")
    except Exception as e:
        messagebox.showerror("Error", f"Failed to process PDF: {e}")

def generate_yaml_files(pdf_text):
    # Example: Split the text into checks (adjust parsing logic as needed)
    checks = pdf_text.split("Check:")  # Assuming "Check:" is a delimiter in the PDF
    output_dir = "CIS_YAML_Files"
    os.makedirs(output_dir, exist_ok=True)

    for i, check in enumerate(checks[1:], start=1):  # Skip the first split part
        # Example YAML structure (adjust based on actual requirements)
        yaml_data = {
            "id": f"Check-{i}",
            "description": check.strip()
        }
        yaml_file_path = os.path.join(output_dir, f"Check-{i}.yml")
        with open(yaml_file_path, 'w') as yaml_file:
            yaml.dump(yaml_data, yaml_file, default_flow_style=False)

def create_gui():
    # Create the main GUI window
    root = tk.Tk()
    root.title("CIS Benchmark PDF to YAML Converter")
    root.geometry("400x200")

    # Add a button to upload the PDF
    upload_button = tk.Button(
        root,
        text="Upload CIS Benchmark PDF",
        command=upload_pdf,
        width=30,
        height=2
    )
    upload_button.pack(pady=50)

    # Run the GUI event loop
    root.mainloop()

if __name__ == "__main__":
    create_gui()
