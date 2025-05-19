import subprocess
import ttkbootstrap as ttk  # Import ttkbootstrap for modern UI
from ttkbootstrap.constants import *
from tkinter import messagebox
from tkinter import filedialog

# Map keywords to model names (no duplicate keys)
PROMPT_MODEL_MAP = {
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

def select_model_by_prompt(prompt, models):
    prompt_lower = prompt.lower()
    # Sort keywords by length (longest first) for more specific matches
    for keyword in sorted(PROMPT_MODEL_MAP, key=len, reverse=True):
        model_name = PROMPT_MODEL_MAP[keyword]
        if keyword in prompt_lower:
            # Check if the mapped model exists in the available models
            for model in models:
                if model[0] == model_name:
                    return model_name
    return None

def run_model():
    user_prompt = prompt_entry.get()
    if not user_prompt.strip():
        messagebox.showwarning("Warning", "Please enter a prompt to run the model!")
        return

    models = get_models()
    model_name = select_model_by_prompt(user_prompt, models)
    if not model_name:
        selected_model_label.config(text="No model auto-selected.")
        messagebox.showwarning("Warning", "No suitable model found for the given prompt!")
        return

    # Visual feedback in the treeview (optional, not interactive)
    for item in tree.get_children():
        if tree.item(item, 'values')[0] == model_name:
            tree.selection_set(item)
            break
        else:
            tree.selection_remove(item)

    try:
        result = subprocess.run(
            ['ollama', 'run', model_name],
            input=user_prompt,
            capture_output=True,
            text=True,
            encoding='utf-8',
            check=True
        )
        if result.stdout.strip():
            output_text.config(state="normal")
            output_text.insert(END, f"Prompt: {user_prompt}\nOutput:\n{result.stdout.strip()}\n{'-' * 50}\n")
            output_text.config(state="disabled")
            output_text.see(END)
        else:
            messagebox.showinfo("Output", "The model completed successfully but did not produce any output.")
    except subprocess.CalledProcessError as e:
        error_message = e.stderr.strip() if e.stderr else "An unknown error occurred."
        messagebox.showerror("Error", error_message)
    except Exception as ex:
        messagebox.showerror("Error", f"An unexpected error occurred: {str(ex)}")

def clear_history():
    output_text.config(state="normal")
    output_text.delete("1.0", END)
    output_text.config(state="disabled")

def save_output():
    output_text.config(state="normal")
    content = output_text.get("1.0", "end-1c")
    output_text.config(state="disabled")
    if not content.strip():
        messagebox.showinfo("Info", "There is no output to save.")
        return
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

def on_prompt_change(event=None):
    user_prompt = prompt_entry.get()
    models = get_models()
    model_name = select_model_by_prompt(user_prompt, models)
    tree.selection_remove(tree.selection())
    if model_name:
        for item in tree.get_children():
            if tree.item(item, 'values')[0] == model_name:
                tree.selection_set(item)
                selected_model_label.config(text=f"Auto-selected model: {model_name}")
                break
    else:
        selected_model_label.config(text="No model auto-selected.")

# Create a modern GUI using ttkbootstrap
app = ttk.Window(themename="superhero")
app.title("Ollama GUI")
app.geometry("800x600")
app.resizable(True, True)

# Frame for the main layout
frame = ttk.Frame(app, padding=10)
frame.pack(fill=BOTH, expand=True)

# Treeview to display models (now read-only, not for selection)
tree_label = ttk.Label(frame, text="Available Models", font=("Helvetica", 12, "bold"))
tree_label.pack(anchor=W, pady=(0, 5))

tree = ttk.Treeview(frame, columns=("NAME", "ID", "SIZE", "MODIFIED"), show='headings', height=8, bootstyle=INFO, selectmode="none")
tree.heading("NAME", text="NAME")
tree.heading("ID", text="ID")
tree.heading("SIZE", text="SIZE")
tree.heading("MODIFIED", text="MODIFIED")
tree.pack(fill=X, pady=(0, 10))

# Prompt dropdown and input field
prompt_frame = ttk.Frame(frame)
prompt_frame.pack(fill=X, pady=(0, 10))

# Add the dropdown (combobox) for prompt suggestions
prompt_dropdown_label = ttk.Label(prompt_frame, text="Prompt:", font=("Helvetica", 10))
prompt_dropdown_label.pack(side=LEFT, padx=(0, 5))

prompt_var = ttk.StringVar()
prompt_dropdown = ttk.Combobox(prompt_frame, textvariable=prompt_var, values=sorted(PROMPT_MODEL_MAP.keys()), width=25, bootstyle=INFO)
prompt_dropdown.pack(side=LEFT, padx=(0, 5))

def on_prompt_dropdown_selected(event=None):
    prompt_entry.delete(0, END)
    prompt_entry.insert(0, prompt_var.get())
    on_prompt_change()  # Update model suggestion

prompt_dropdown.bind("<<ComboboxSelected>>", on_prompt_dropdown_selected)

prompt_entry = ttk.Entry(prompt_frame, width=50)
prompt_entry.pack(side=LEFT, fill=X, expand=True)

selected_model_label = ttk.Label(frame, text="", font=("Helvetica", 9, "italic"))
selected_model_label.pack(anchor=W, pady=(0, 5))

# Buttons for actions
button_frame = ttk.Frame(frame)
button_frame.pack(fill=X, pady=(0, 10))

refresh_button = ttk.Button(button_frame, text="Refresh Models", bootstyle=SUCCESS, command=refresh_models)
refresh_button.pack(side=LEFT, padx=(0, 5))

run_button = ttk.Button(button_frame, text="Run Model", bootstyle=PRIMARY, command=run_model)
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

# Bind real-time model suggestion to prompt entry
prompt_entry.bind("<KeyRelease>", on_prompt_change)

# Set focus to prompt entry on start
prompt_entry.focus_set()

# Run the main loop
app.mainloop()
