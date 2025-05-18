import subprocess
import ttkbootstrap as ttk  # Import ttkbootstrap for modern UI
from ttkbootstrap.constants import *
from tkinter import messagebox


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
            output_text.insert(END, f"Prompt: {user_prompt}\nOutput:\n{result.stdout.strip()}\n{'-' * 50}\n")
            output_text.config(state="disabled")  # Disable editing to make it read-only
            output_text.see(END)  # Scroll to the end
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
    output_text.delete("1.0", END)  # Clear all text
    output_text.config(state="disabled")  # Disable editing to make it read-only


# Create a modern GUI using ttkbootstrap
app = ttk.Window(themename="superhero")  # Choose a modern theme
app.title("Ollama GUI")
app.geometry("800x600")
app.resizable(True, True)

# Frame for the main layout
frame = ttk.Frame(app, padding=10)
frame.pack(fill=BOTH, expand=True)

# Treeview to display models
tree_label = ttk.Label(frame, text="Available Models", font=("Helvetica", 12, "bold"))
tree_label.pack(anchor=W, pady=(0, 5))

tree = ttk.Treeview(frame, columns=("NAME", "ID", "SIZE", "MODIFIED"), show='headings', height=8, bootstyle=INFO)
tree.heading("NAME", text="NAME")
tree.heading("ID", text="ID")
tree.heading("SIZE", text="SIZE")
tree.heading("MODIFIED", text="MODIFIED")
tree.pack(fill=X, pady=(0, 10))

# Prompt input field
prompt_frame = ttk.Frame(frame)
prompt_frame.pack(fill=X, pady=(0, 10))

prompt_label = ttk.Label(prompt_frame, text="Enter Prompt:", font=("Helvetica", 10))
prompt_label.pack(side=LEFT, padx=(0, 5))

prompt_entry = ttk.Entry(prompt_frame, width=50)
prompt_entry.pack(side=LEFT, fill=X, expand=True)

# Buttons for actions
button_frame = ttk.Frame(frame)
button_frame.pack(fill=X, pady=(0, 10))

refresh_button = ttk.Button(button_frame, text="Refresh Models", bootstyle=SUCCESS, command=refresh_models)
refresh_button.pack(side=LEFT, padx=(0, 5))

run_button = ttk.Button(button_frame, text="Run Selected Model", bootstyle=PRIMARY, command=run_model)
run_button.pack(side=LEFT, padx=(0, 5))

clear_button = ttk.Button(button_frame, text="Clear History", bootstyle=WARNING, command=clear_history)
clear_button.pack(side=LEFT, padx=(0, 5))

# Output Text Area with Scrollbar
output_frame = ttk.Labelframe(frame, text="Output", padding=10, bootstyle=DARK)
output_frame.pack(fill=BOTH, expand=True, pady=(0, 10))

output_text = ttk.Text(output_frame, wrap="word", height=15, state="disabled")
output_text.pack(side=LEFT, fill=BOTH, expand=True)

scrollbar = ttk.Scrollbar(output_frame, orient="vertical", command=output_text.yview)
scrollbar.pack(side=RIGHT, fill=Y)

output_text["yscrollcommand"] = scrollbar.set

# Initialize models
refresh_models()

# Run the main loop
app.mainloop()