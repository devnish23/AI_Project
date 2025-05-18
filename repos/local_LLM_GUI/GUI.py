import tkinter as tk
from tkinter import scrolledtext

# Mock function to simulate interaction with a local LLM
def query_local_llm(prompt: str) -> str:
    # Replace this with the actual logic to query your local LLM
    return f"Response to: {prompt}"

# Function to handle sending a message
def send_message():
    user_input = user_entry.get()
    if user_input.strip():
        chat_display.insert(tk.END, f"You: {user_input}\n")
        user_entry.delete(0, tk.END)
        
        # Get response from the local LLM
        response = query_local_llm(user_input)
        chat_display.insert(tk.END, f"LLM: {response}\n")

# Create the main application window
app = tk.Tk()
app.title("Chat with Local LLM")

# Chat display area
chat_display = scrolledtext.ScrolledText(app, wrap=tk.WORD, state='normal', height=20, width=50)
chat_display.pack(padx=10, pady=10)
chat_display.config(state='disabled')  # Make it read-only initially

# Entry field for user input
user_entry = tk.Entry(app, width=40)
user_entry.pack(padx=10, pady=5, side=tk.LEFT)

# Send button
send_button = tk.Button(app, text="Send", command=send_message)
send_button.pack(padx=10, pady=5, side=tk.LEFT)

# Run the application
app.mainloop()