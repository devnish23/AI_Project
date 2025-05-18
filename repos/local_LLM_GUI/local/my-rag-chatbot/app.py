import streamlit as st
from rag_chain import get_rag_chain

st.set_page_config(page_title="Company RAG Chatbot", layout="wide")
st.markdown("""
    <style>
        .stChatInput > div {
            border: 2px solid #888;
            border-radius: 10px;
            padding: 10px;
        }
    </style>
""", unsafe_allow_html=True)

st.title("📚 Company Document Chatbot")
st.write("Ask questions based on your internal company policies, procedures, and documentation.")

qa_chain = get_rag_chain()

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# Chat UI
with st.form("chat_form", clear_on_submit=True):
    user_input = st.text_input("Ask your question", key="user_input")
    submitted = st.form_submit_button("Send")

if submitted and user_input:
    with st.spinner("Thinking..."):
        answer = qa_chain.run(user_input)
        st.session_state.chat_history.append((user_input, answer))

# Display chat history
for i, (q, a) in enumerate(reversed(st.session_state.chat_history)):
    st.markdown(f"**You:** {q}")
    st.markdown(f"**Bot:** {a}")
    st.markdown("---")
