# Use a base image with Python pre-installed
FROM python:3.10-slim

# Set environment variables
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    wget \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-pip \
    unzip \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies for supported languages and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ansible \
    golang \
    terraform \
    kubectl \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI for Dockerfile generation
RUN curl -fsSL https://get.docker.com | sh

# Install Python packages for the web application and LLM
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Install additional tools for PowerShell and Shell scripting
RUN apt-get update && apt-get install -y --no-install-recommends \
    powershell \
    && rm -rf /var/lib/apt/lists/*

# Set up the application directory
WORKDIR /app

# Copy the application code
COPY . /app

# Expose the port the web application will run on
EXPOSE 5000

# Command to run the web application
CMD ["python", "app.py"]
