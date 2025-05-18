import paramiko
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox, scrolledtext


def connect_to_server():
    """Connect to the server and fetch filesystem status."""
    server_name = server_entry.get()
    username = username_entry.get()
    password = password_entry.get()
    private_key_path = private_key_entry.get()

    if not server_name or not username:
        messagebox.showwarning("Warning", "Please enter the server name and username!")
        return

    try:
        # Establish SSH connection
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        if private_key_path:  # Password-less authentication
            private_key = paramiko.RSAKey.from_private_key_file(private_key_path)
            ssh.connect(server_name, username=username, pkey=private_key)
        else:  # Password authentication
            if not password:
                messagebox.showwarning("Warning", "Please enter a password or provide a private key!")
                return
            ssh.connect(server_name, username=username, password=password)

        # Execute command to check filesystem status
        stdin, stdout, stderr = ssh.exec_command("df -h")
        output = stdout.read().decode("utf-8")
        error = stderr.read().decode("utf-8")

        ssh.close()

        if error:
            messagebox.showerror("Error", f"Error fetching filesystem status: {error}")
        else:
            # Create a new tab with the server name as the heading
            create_output_tab(server_name, output)

    except Exception as e:
        messagebox.showerror("Error", f"Failed to connect to server: {str(e)}")


def create_output_tab(server_name, output):
    """Create a new tab for the server and display the output."""
    tab = ttk.Frame(notebook)
    notebook.add(tab, text=server_name)

    # Add a scrolled text box to display the output
    output_text = scrolledtext.ScrolledText(tab, wrap="word", height=20, state="normal")
    output_text.insert("1.0", output)
    output_text.config(state="disabled")  # Make it read-only
    output_text.pack(fill=BOTH, expand=True)


# Create GUI using ttkbootstrap
app = ttk.Window(themename="superhero")
app.title("Server Connection GUI")
app.geometry("900x600")

# Server connection frame
connection_frame = ttk.Labelframe(app, text="Connect to Server", padding=10)
connection_frame.pack(fill=X, padx=10, pady=10)

# Server name
server_label = ttk.Label(connection_frame, text="Server Name:", font=("Helvetica", 10))
server_label.grid(row=0, column=0, padx=5, pady=5, sticky=W)
server_entry = ttk.Entry(connection_frame, width=30)
server_entry.grid(row=0, column=1, padx=5, pady=5)

# Username
username_label = ttk.Label(connection_frame, text="Username:", font=("Helvetica", 10))
username_label.grid(row=1, column=0, padx=5, pady=5, sticky=W)
username_entry = ttk.Entry(connection_frame, width=30)
username_entry.grid(row=1, column=1, padx=5, pady=5)

# Password
password_label = ttk.Label(connection_frame, text="Password:", font=("Helvetica", 10))
password_label.grid(row=2, column=0, padx=5, pady=5, sticky=W)
password_entry = ttk.Entry(connection_frame, width=30, show="*")
password_entry.grid(row=2, column=1, padx=5, pady=5)

# Private key
private_key_label = ttk.Label(connection_frame, text="Private Key Path (Optional):", font=("Helvetica", 10))
private_key_label.grid(row=3, column=0, padx=5, pady=5, sticky=W)
private_key_entry = ttk.Entry(connection_frame, width=30)
private_key_entry.grid(row=3, column=1, padx=5, pady=5)

# Connect button
connect_button = ttk.Button(connection_frame, text="Connect and Check Filesystem", bootstyle=PRIMARY, command=connect_to_server)
connect_button.grid(row=4, column=0, columnspan=2, pady=10)

# Notebook (Tabs for server outputs)
notebook = ttk.Notebook(app)
notebook.pack(fill=BOTH, expand=True, padx=10, pady=10)

# Start the application
app.mainloop()