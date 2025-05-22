import gradio as gr
##from llama_index import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.vector_stores import ChromaVectorStore
from llama_index.embeddings import HuggingFaceEmbedding
from llama_index.llms import Ollama

# 1. Load and index documents
reader = SimpleDirectoryReader("company_docs")
documents = reader.load_data()

embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en")
vector_store = ChromaVectorStore(persist_dir="chroma_db")

index = VectorStoreIndex.from_documents(
    documents, embed_model=embed_model, vector_store=vector_store
)

# 2. Set up LLM (Ollama must be running)
llm = Ollama(model="llama2")

# 3. Define Q&A function
def rag_qa(user_query):
    query_engine = index.as_query_engine(llm=llm)
    response = query_engine.query(user_query)
    return str(response)

# 4. Gradio UI
iface = gr.Interface(
    fn=rag_qa,
    inputs=gr.Textbox(label="Ask about CIS Benchmarks or Security Hardening"),
    outputs=gr.Textbox(label="Response"),
    title="Local CIS Assistant (Llama 2 + RAG)"
)

iface.launch()
