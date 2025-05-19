import subprocess
import ttkbootstrap as ttk  # Import ttkbootstrap for modern UI
from ttkbootstrap.constants import *
from tkinter import messagebox
from tkinter import filedialog

# Map keywords to model names
PROMPT_MODEL_MAP = {
    "ppt": "your_ppt_model_name",  # Replace with actual model name
    "powerpoint": "your_ppt_model_name",
    "download": "your_ppt_model_name",
    "ppt": "pptgen",
    "powerpoint": "pptgen",
    "download": "pptgen",
    "code": "codegen",
    "generate code": "codegen",
    "summarize": "summarizer",
    "summary": "summarizer",
    "translate": "translator",
    "translation": "translator",
    "image": "imagegen",
    "picture": "imagegen",
    # PowerPoint generation
    "ppt": "pptgen",
    "powerpoint": "pptgen",
    "presentation": "pptgen",
    "create ppt": "pptgen",
    "download ppt": "pptgen",

    # Code generation
    "code": "codegen",
    "generate code": "codegen",
    "write code": "codegen",

    # Summarization
    "summarize": "summarizer",
    "summary": "summarizer",

    # Translation
    "translate": "translator",
    "translation": "translator",

    # Image generation
    "image": "imagegen",
    "picture": "imagegen",
    "generate image": "imagegen",
}

def get_models():
    """
    Fetch the list of available Ollama models by running the 'ollama list' command.

    Returns:
        list: A list of lists, where each sublist contains model details (name, id, size, modified).
              Returns an empty list if fetching fails.
    """
    try:
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, encoding='utf-8', check=True)
        models = result.stdout.strip().split('\n')[1:]  # Skip the header row
        return [line.split() for line in models]
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Error", f"Failed to fetch models: {e}")
        return []

def refresh_models():
    """
    Refresh the model list displayed in the treeview by fetching the latest models
    and updating the treeview widget.
    """
    models = get_models()
    for row in tree.get_children():
        tree.delete(row)
    for model in models:
        tree.insert("", "end", values=model)

def select_model_by_prompt(prompt, models):
    """
    Select a model name based on the user's prompt using keyword mapping.

    Args:
        prompt (str): The user's input prompt.
        models (list): The list of available models.

    Returns:
        str or None: The name of the matched model, or None if no match is found.
    """
    prompt_lower = prompt.lower()
    for keyword, model_name in PROMPT_MODEL_MAP.items():
        if keyword in prompt_lower:
            # Check if the mapped model exists in the available models
            for model in models:
                if model[0] == model_name:
                    return model_name
    return None

def run_model():
    """
    Run the selected or auto-matched model with the user's prompt.
    Displays the output in the output text area and handles errors.
    """
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
    """
    Clear all text from the output text area, making it empty and read-only.
    """
    output_text.config(state="normal")  # Enable editing temporarily
    output_text.delete("1.0", END)  # Clear all text
    output_text.config(state="disabled")  # Disable editing to make it read-only

def save_output():
    """
    Save the contents of the output text area to a file selected by the user.
    Shows a dialog for file selection and handles file write errors.
    """
    output_text.config(state="normal")
    content = output_text.get("1.0", "end-1c")
    output_text.config(state="disabled")
    if not content.strip():
        messagebox.showinfo("Info", "There is no output to save.")
        return
    # Ask user for file location
    file_path = filedialog.asksaveasfilename(
        defaultextension=".txt",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    if file_path:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            messagebox.showinfo("Success", f"Output saved to {file_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save file: {e}")

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

save_button = ttk.Button(button_frame, text="Save Output", bootstyle=SECONDARY, command=save_output)
save_button.pack(side=LEFT, padx=(0, 5))

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
