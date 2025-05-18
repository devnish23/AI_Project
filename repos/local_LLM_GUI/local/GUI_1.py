import subprocess
import tkinter as tk
from tkinter import ttk, messagebox

def get_models():
    try:
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, encoding='utf-8', check=True)
        models = result.stdout.strip().split('\n')[1:]  # Skip the header row
        return [line.split() for line in models]
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Error", f"Failed to fetch models: {e}")
        return []

def refresh_models():
    models = get_models()
    for row in tree.get_children():
        tree.delete(row)
    for model in models:
        tree.insert("", "end", values=model)

def run_model():
    selected_item = tree.selection()
    if not selected_item:
        messagebox.showwarning("Warning", "Please select a model to run!")
        return

    model_name = tree.item(selected_item[0], 'values')[0]
    
    try:
        # Run the command and capture output
        result = subprocess.run(
            ['ollama', 'run', model_name],
            capture_output=True,
            text=True,
            encoding='utf-8',  # Ensure UTF-8 encoding
            check=True
        )
        # Display the command output
        if result.stdout.strip():
            messagebox.showinfo("Output", result.stdout.strip())
        else:
            messagebox.showinfo("Output", "The command completed successfully but did not produce any output.")
    except subprocess.CalledProcessError as e:
        # Display the error output
        error_message = e.stderr.strip() if e.stderr else "An unknown error occurred."
        messagebox.showerror("Error", error_message)
    except Exception as ex:
        # Display unexpected exceptions
        messagebox.showerror("Error", f"An unexpected error occurred: {str(ex)}")

# Create GUI
root = tk.Tk()
root.title("Ollama GUI")

frame = ttk.Frame(root, padding="10")
frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

tree = ttk.Treeview(frame, columns=("NAME", "ID", "SIZE", "MODIFIED"), show='headings', height=10)
tree.heading("NAME", text="NAME")
tree.heading("ID", text="ID")
tree.heading("SIZE", text="SIZE")
tree.heading("MODIFIED", text="MODIFIED")
tree.grid(row=0, column=0, columnspan=2)

refresh_button = ttk.Button(frame, text="Refresh Models", command=refresh_models)
refresh_button.grid(row=1, column=0, sticky=tk.W)

run_button = ttk.Button(frame, text="Run Selected Model", command=run_model)
run_button.grid(row=1, column=1, sticky=tk.E)

# Initialize models
refresh_models()

root.mainloop()