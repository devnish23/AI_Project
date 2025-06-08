import tkinter as tk
from tkinter import ttk, messagebox
import paramiko

# Function to connect to the server and execute a command
def ssh_connect(ip, username, password, command):
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(ip, username=username, password=password)
        stdin, stdout, stderr = ssh.exec_command(command)
        result = stdout.read().decode('utf-8')
        ssh.close()
        return result
    except Exception as e:
        return f"Error: {str(e)}"

# Function to handle health check
def perform_check():
    selected_option = health_check_dropdown.get()
    ip = ip_entry.get()
    username = username_entry.get()
    password = password_entry.get()

    if not ip or not username or not password:
        messagebox.showerror("Error", "Please fill in all fields!")
        return

    if selected_option == "CPU":
        command = "top -bn1 | grep 'Cpu(s)'"
    elif selected_option == "Memory":
        command = "free -m"
    elif selected_option == "Disk":
        command = "df -h"
    else:
        messagebox.showerror("Error", "Please select a valid health check option!")
        return

    result = ssh_connect(ip, username, password, command)
    result_label.config(text=result)

# GUI Setup
root = tk.Tk()
root.title("Server Health Check")

# IP Address
tk.Label(root, text="IP Address:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
ip_entry = tk.Entry(root)
ip_entry.grid(row=0, column=1, padx=10, pady=5)

# Username
tk.Label(root, text="Username:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
username_entry = tk.Entry(root)
username_entry.grid(row=1, column=1, padx=10, pady=5)

# Password
tk.Label(root, text="Password:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
password_entry = tk.Entry(root, show="*")
password_entry.grid(row=2, column=1, padx=10, pady=5)

# Dropdown for Health Check
tk.Label(root, text="Health Check:").grid(row=3, column=0, padx=10, pady=5, sticky="e")
health_check_dropdown = ttk.Combobox(root, values=["CPU", "Memory", "Disk"])
health_check_dropdown.grid(row=3, column=1, padx=10, pady=5)

# Button to perform health check
check_button = tk.Button(root, text="Check", command=perform_check)
check_button.grid(row=4, column=0, columnspan=2, pady=10)

# Result Label
result_label = tk.Label(root, text="", justify="left", anchor="w")
result_label.grid(row=5, column=0, columnspan=2, padx=10, pady=10)

root.mainloop()
