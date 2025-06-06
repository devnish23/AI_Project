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
    user_prompt = prompt_entry.get()

    if not user_prompt.strip():
        messagebox.showwarning("Warning", "Please enter a prompt to run the model!")
        return

    try:
        # Run the command with the user's prompt
        result = subprocess.run(
            ['ollama', 'run', model_name],
            input=user_prompt,  # Pass the prompt to the command
            capture_output=True,
            text=True,
            encoding='utf-8',
            check=True
        )
        # Append the command output to the output text area
        if result.stdout.strip():
            output_text.config(state="normal")  # Enable editing temporarily
            output_text.insert(tk.END, f"Prompt: {user_prompt}\nOutput:\n{result.stdout.strip()}\n{'-' * 50}\n")
            output_text.config(state="disabled")  # Disable editing to make it read-only
            output_text.see(tk.END)  # Scroll to the end
        else:
            messagebox.showinfo("Output", "The model completed successfully but did not produce any output.")
    except subprocess.CalledProcessError as e:
        # Display the error output
        error_message = e.stderr.strip() if e.stderr else "An unknown error occurred."
        messagebox.showerror("Error", error_message)
    except Exception as ex:
        # Display unexpected exceptions
        messagebox.showerror("Error", f"An unexpected error occurred: {str(ex)}")


def clear_history():
    output_text.config(state="normal")  # Enable editing temporarily
    output_text.delete("1.0", tk.END)  # Clear all text
    output_text.config(state="disabled")  # Disable editing to make it read-only


# Create GUI
root = tk.Tk()
root.title("Ollama GUI")

frame = ttk.Frame(root, padding="10")
frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

# Treeview to display models
tree = ttk.Treeview(frame, columns=("NAME", "ID", "SIZE", "MODIFIED"), show='headings', height=10)
tree.heading("NAME", text="NAME")
tree.heading("ID", text="ID")
tree.heading("SIZE", text="SIZE")
tree.heading("MODIFIED", text="MODIFIED")
tree.grid(row=0, column=0, columnspan=3)

# Prompt input field
prompt_label = ttk.Label(frame, text="Enter Prompt:")
prompt_label.grid(row=1, column=0, sticky=tk.W)

prompt_entry = ttk.Entry(frame, width=50)
prompt_entry.grid(row=1, column=1, sticky=(tk.W, tk.E))

# Buttons
refresh_button = ttk.Button(frame, text="Refresh Models", command=refresh_models)
refresh_button.grid(row=2, column=0, sticky=tk.W)

run_button = ttk.Button(frame, text="Run Selected Model", command=run_model)
run_button.grid(row=2, column=1, sticky=tk.W)

clear_button = ttk.Button(frame, text="Clear History", command=clear_history)
clear_button.grid(row=2, column=2, sticky=tk.E)

# Output Text Area with Scrollbar
output_frame = ttk.Frame(frame)
output_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S))

output_text = tk.Text(output_frame, wrap="word", height=15, state="disabled")
output_text.grid(row=0, column=0, sticky=(tk.W, tk.E))

scrollbar = ttk.Scrollbar(output_frame, orient="vertical", command=output_text.yview)
scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))

output_text["yscrollcommand"] = scrollbar.set

# Initialize models
refresh_models()

root.mainloop()
