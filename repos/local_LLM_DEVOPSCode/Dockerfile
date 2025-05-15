# Use a base image with Python and common tools
FROM python:3.10-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    unzip \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    software-properties-common \
    && apt-get clean

# Install language-specific tools
# Install Go
RUN wget https://go.dev/dl/go1.20.5.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.20.5.linux-amd64.tar.gz && \
    rm go1.20.5.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:$PATH"

# Install Terraform
RUN wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip && \
    unzip terraform_1.5.0_linux_amd64.zip -d /usr/local/bin && \
    rm terraform_1.5.0_linux_amd64.zip

# Install PowerShell
RUN wget -q https://packages.microsoft.com/config/debian/10/packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y powershell && \
    rm packages-microsoft-prod.deb

# Install Ansible
RUN pip install ansible

# Install additional Python dependencies for the local LLM
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Set up the application directory
WORKDIR /app

# Copy the application code
COPY . /app

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["python", "app.py"]
