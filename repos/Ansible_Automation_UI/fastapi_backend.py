from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from pydantic import BaseModel
import os

app = FastAPI()

PLAYBOOK_DIR = os.path.join(os.path.dirname(__file__), "playbooks")
os.makedirs(PLAYBOOK_DIR, exist_ok=True)

USERS = {
    "admin": {"password": "admin", "role": "admin"},
    "operator": {"password": "operator", "role": "operator"},
}

def authenticate(username: str, password: str):
    if username in USERS and USERS[username]["password"] == password:
        return {"username": username, "role": USERS[username]["role"]}
    return None

class Playbook(BaseModel):
    name: str
    prompt: str

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return {"message": "login successful", "role": user["role"]}

@app.post("/generate_playbook")
def generate_playbook(pb: Playbook):
    # In a real implementation this would call an AI model
    text = f"# Playbook generated for {pb.name}\n{pb.prompt}"
    path = os.path.join(PLAYBOOK_DIR, f"{pb.name}.yml")
    with open(path, "w") as f:
        f.write(text)
    return {"message": f"playbook {pb.name} created"}

@app.get("/playbooks", response_model=List[str])
def list_playbooks():
    return [f for f in os.listdir(PLAYBOOK_DIR) if f.endswith(".yml")]

class Device(BaseModel):
    device: str

@app.post("/onboard")
def onboard(dev: Device):
    # Dummy success
    return {"status": "connected", "device": dev.device}

class RunRequest(BaseModel):
    name: str

@app.post("/run_playbook")
def run_playbook(req: RunRequest):
    path = os.path.join(PLAYBOOK_DIR, f"{req.name}.yml")
    if not os.path.exists(path):
        raise HTTPException(status_code=404)
    return {"status": "executed", "playbook": req.name}
