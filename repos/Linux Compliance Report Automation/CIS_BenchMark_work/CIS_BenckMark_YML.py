import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox

# Function to convert CIS Benchmark text to Ansible YAML
def convert_cis_to_ansible(file_path):
    try:
        with open(file_path, 'r') as file:
            lines = file.readlines()

        yaml_content = []
        current_point = None
        audit_command = None

        for line in lines:
            # Match CIS Benchmark points (e.g., "2.3.3 Ensure nis client is not installed (Automated)")
            point_match = re.match(r"^\d+\.\d+\.\d+.*Ensure.*", line.strip())
            if point_match:
                # Save the current benchmark point
                current_point = line.strip()
            # Match Audit commands
            elif line.strip().startswith("Audit:"):
                audit_command = line.strip().replace("Audit:", "").strip()
            
            # If we have both a benchmark point and an audit command, generate YAML
            if current_point and audit_command:
                yaml_snippet = f"""\
- name: {current_point}
  hosts: all
  tasks:
    - name: Check compliance for {current_point}
      shell: {audit_command}
      register: audit_output

    - name: Ensure compliance with {current_point}
      debug:
        msg: |
          Compliance Output: {{{{ audit_output.stdout }}}}
"""
                yaml_content.append(yaml_snippet)
                # Reset for the next point
                current_point = None
                audit_command = None

        # Save YAML output
        output_path = os.path.splitext(file_path)[0] + ".yml"
        with open(output_path, 'w') as yaml_file:
            yaml_file.writelines(yaml_content)

        return output_path
    except Exception as e:
        print(f"Error converting file {file_path}: {e}")
        return None

# Function to handle file selection and conversion
def select_and_convert_files():
    file_paths = filedialog.askopenfilenames(title="Select CIS Benchmark Files", filetypes=[("Text Files", "*.txt")])
    if not file_paths:
        return

    success_files = []
    for file_path in file_paths:
        output_path = convert_cis_to_ansible(file_path)
        if output_path:
            success_files.append(output_path)

    if success_files:
        messagebox.showinfo("Success", f"Converted {len(success_files)} files successfully!\nOutput saved as YAML.")
    else:
        messagebox.showerror("Error", "No files were converted.")

# Main GUI setup
def main():
    root = tk.Tk()
    root.title("CIS Benchmark to Ansible YAML Converter")

    # Window size
    root.geometry("500x200")

    # Instruction label
    label = tk.Label(root, text="Select CIS Benchmark files to convert to Ansible YAML.", wraplength=400, justify="center")
    label.pack(pady=20)

    # File selection button
    select_button = tk.Button(root, text="Select Files", command=select_and_convert_files)
    select_button.pack(pady=10)

    # Exit button
    exit_button = tk.Button(root, text="Exit", command=root.quit)
    exit_button.pack(pady=10)

    root.mainloop()

if __name__ == "__main__":
    main()
