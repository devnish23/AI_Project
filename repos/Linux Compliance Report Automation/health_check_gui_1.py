import tkinter as tk
from tkinter import ttk, messagebox
import paramiko

# Function to connect to the server and execute a command via SSH
def ssh_connect(ip, username, password, command):
    """
    Establishes an SSH connection to the server and executes the given command.
    :param ip: IP address of the server
    :param username: Username for SSH login
    :param password: Password for SSH login
    :param command: Command to execute on the server
    :return: Command output or error message
    """
    try:
        # Initialize SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect to the server
        ssh.connect(ip, username=username, password=password)
        
        # Execute the command
        stdin, stdout, stderr = ssh.exec_command(command)
        result = stdout.read().decode('utf-8')
        
        # Close the SSH connection
        ssh.close()
        return result

    except Exception as e:
        # Return error message in case of failure
        return f"Error: {str(e)}"

# Function to handle health checks based on user selection
def perform_check():
    """
    Handles the health check functionality when the "Check" button is clicked.
    It retrieves the selected health check option and executes the relevant command.
    """
    # Retrieve user inputs
    selected_option = health_check_dropdown.get()
    ip = ip_entry.get()
    username = username_entry.get()
    password = password_entry.get()

    # Validate inputs
    if not ip or not username or not password:
        messagebox.showerror("Error", "Please fill in all fields!")
        return

    # Determine the command based on the selected health check option
    if selected_option == "CPU":
        command = "top -bn1 | grep 'Cpu(s)'"
    elif selected_option == "Memory":
        command = "free -m"
    elif selected_option == "Disk":
        command = "df -h"
    else:
        messagebox.showerror("Error", "Please select a valid health check option!")
        return

    # Perform the health check via SSH
    result = ssh_connect(ip, username, password, command)
    
    # Display the result in the result label
    result_label.config(text=result)

# GUI Setup
root = tk.Tk()
root.title("Server Health Check")
root.geometry("500x400")  # Set window size

# IP Address Input
tk.Label(root, text="IP Address:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
ip_entry = tk.Entry(root, width=30)
ip_entry.grid(row=0, column=1, padx=10, pady=5)

# Username Input
tk.Label(root, text="Username:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
username_entry = tk.Entry(root, width=30)
username_entry.grid(row=1, column=1, padx=10, pady=5)

# Password Input
tk.Label(root, text="Password:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
password_entry = tk.Entry(root, show="*", width=30)
password_entry.grid(row=2, column=1, padx=10, pady=5)

# Health Check Dropdown
tk.Label(root, text="Health Check:").grid(row=3, column=0, padx=10, pady=5, sticky="e")
health_check_dropdown = ttk.Combobox(root, values=["CPU", "Memory", "Disk"], width=27)
health_check_dropdown.grid(row=3, column=1, padx=10, pady=5)

# Check Button
check_button = tk.Button(root, text="Check", command=perform_check, width=15)
check_button.grid(row=4, column=0, columnspan=2, pady=10)

# Result Label
result_label = tk.Label(root, text="", justify="left", anchor="w", wraplength=450, bg="white", relief="sunken")
result_label.grid(row=5, column=0, columnspan=2, padx=10, pady=10, sticky="we")

# Run the GUI event loop
root.mainloop()
