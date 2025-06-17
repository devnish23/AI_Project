import os
from flask import Flask, request, jsonify, session, abort
from functools import wraps
from transformers import pipeline
import yaml

app = Flask(__name__)
app.secret_key = "change-me"  # for session management

# Simple in-memory user store
USERS = {
    "admin": {"password": "admin", "role": "admin"},
    "operator": {"password": "operator", "role": "operator"},
}

# Load a small language model
generator = pipeline("text-generation", model="gpt2")

PLAYBOOK_DIR = os.path.join(os.path.dirname(__file__), "playbooks")
os.makedirs(PLAYBOOK_DIR, exist_ok=True)


def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = session.get("user")
            if not user:
                abort(401)
            if role and USERS[user]["role"] != role:
                abort(403)
            return f(*args, **kwargs)
        return wrapper
    return decorator


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if username in USERS and USERS[username]["password"] == password:
        session["user"] = username
        return jsonify({"message": "login successful"})
    abort(401)


@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"message": "logged out"})


# Admin routes
@app.route("/generate_playbook", methods=["POST"])
@login_required(role="admin")
def generate_playbook():
    data = request.json
    prompt = data.get("prompt", "")
    name = data.get("name", "generated")
    result = generator(prompt, max_length=100, num_return_sequences=1)
    playbook_text = result[0]["generated_text"]
    path = os.path.join(PLAYBOOK_DIR, f"{name}.yml")
    with open(path, "w") as f:
        f.write(playbook_text)
    return jsonify({"message": f"playbook {name} created"})


@app.route("/playbooks", methods=["GET"])
@login_required()
def list_playbooks():
    files = [f for f in os.listdir(PLAYBOOK_DIR) if f.endswith(".yml")]
    return jsonify(files)


# Operator routes
@app.route("/onboard", methods=["POST"])
@login_required(role="operator")
def onboard():
    data = request.json
    device = data.get("device")
    # Simulate connection test
    connected = True  # Always successful in this demo
    if not connected:
        return jsonify({"status": "failed", "device": device}), 500
    return jsonify({"status": "connected", "device": device})


@app.route("/run_playbook", methods=["POST"])
@login_required(role="operator")
def run_playbook():
    data = request.json
    name = data.get("name")
    path = os.path.join(PLAYBOOK_DIR, f"{name}.yml")
    if not os.path.exists(path):
        abort(404)
    # Simulate execution
    return jsonify({"status": "executed", "playbook": name})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
