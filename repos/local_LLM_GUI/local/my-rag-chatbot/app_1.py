# app.py
import streamlit as st
from rag_chain import get_rag_chain, load_and_update_docs
import datetime
import os

st.set_page_config(page_title="Company RAG Chatbot", layout="wide")

# --- Authentication ---
USER_CREDENTIALS = {"admin": "password123", "user1": "secret"}

if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if not st.session_state.authenticated:
    with st.form("login_form"):
        st.subheader("🔐 Login")
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")

        if submitted:
            if username in USER_CREDENTIALS and USER_CREDENTIALS[username] == password:
                st.session_state.authenticated = True
                st.session_state.username = username
            else:
                st.error("Invalid credentials")
    st.stop()

# --- Load RAG Chain ---
qa_chain = get_rag_chain()

# --- Title and Intro ---
st.title("📚 Company Document Chatbot")
st.write("Ask questions based on your internal company policies, procedures, and documentation.")

# --- File Upload ---
st.subheader("📂 Upload New Company Documents")
uploaded_files = st.file_uploader("Upload PDF, DOCX, or XLSX", accept_multiple_files=True)
if uploaded_files:
    for uploaded_file in uploaded_files:
        with open(os.path.join("company_docs", uploaded_file.name), "wb") as f:
            f.write(uploaded_file.getbuffer())
    st.success("Uploaded successfully! Updating knowledge base...")
    load_and_update_docs("company_docs")
    st.success("Knowledge base updated!")

# --- Chat UI ---
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

with st.form("chat_form", clear_on_submit=True):
    user_input = st.text_input("Ask your question", key="user_input")
    submitted = st.form_submit_button("Send")

if submitted and user_input:
    with st.spinner("Thinking..."):
        answer = qa_chain.run(user_input)
        st.session_state.chat_history.append((user_input, answer))

        # --- Log Q&A ---
        log_file = f"logs/{st.session_state.username}_log.txt"
        os.makedirs("logs", exist_ok=True)
        with open(log_file, "a") as log:
            log.write(f"[{datetime.datetime.now()}] {user_input} => {answer}\n")

# --- Chat History ---
for q, a in reversed(st.session_state.chat_history):
    st.markdown(f"**You:** {q}")
    st.markdown(f"**Bot:** {a}")
    st.markdown("---")
