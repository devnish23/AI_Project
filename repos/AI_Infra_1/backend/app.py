from flask import Flask, jsonify, send_from_directory
from transformers import pipeline

app = Flask(__name__, static_folder="../frontend/build")

# Load LLM model
model = pipeline("text-generation", model="gpt-2")

@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.json
    prompt = data.get("prompt", "")
    result = model(prompt, max_length=50, num_return_sequences=1)
    return jsonify(result)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)