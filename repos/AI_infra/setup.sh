#!/bin/bash

# Update the package list and upgrade existing packages
sudo apt-get update && sudo apt-get upgrade -y

# Create a new user (replace 'newuser' and 'password123' with desired values)
sudo useradd -m -s /bin/bash newuser
echo "newuser:password123" | sudo chpasswd

# Install Python and pip
sudo apt-get install -y python3 python3-venv python3-pip

# Switch to the new user and create a Python virtual environment
sudo -i -u newuser bash << EOF
mkdir -p ~/python_envs/olama_env
python3 -m venv ~/python_envs/olama_env
source ~/python_envs/olama_env/bin/activate
pip install --upgrade pip
pip install olama
EOF

echo "Setup completed successfully."
