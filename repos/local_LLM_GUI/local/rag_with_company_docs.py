from langchain.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredExcelLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OllamaEmbeddings
from langchain.vectorstores import Chroma
from langchain.llms import Ollama
from langchain.chains import RetrievalQA
import os

# --- Load all documents ---
def load_docs(folder_path):
    docs = []
    for file in os.listdir(folder_path):
        path = os.path.join(folder_path, file)
        if file.endswith(".pdf"):
            docs.extend(PyPDFLoader(path).load())
        elif file.endswith(".docx"):
            docs.extend(Docx2txtLoader(path).load())
        elif file.endswith(".xlsx"):
            docs.extend(UnstructuredExcelLoader(path).load())
    return docs

# --- Step 1: Load and split documents ---
folder = "company_docs"  # put your PDFs, DOCX, XLSX here
documents = load_docs(folder)
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)

# --- Step 2: Embed and store in Chroma ---
embedding = OllamaEmbeddings(model="nomic-embed-text")
vectordb = Chroma.from_documents(chunks, embedding=embedding, persist_directory="./chroma_db")
vectordb.persist()

# --- Step 3: Ask questions ---
llm = Ollama(model="mistral")
qa = RetrievalQA.from_chain_type(llm=llm, retriever=vectordb.as_retriever())

while True:
    question = input("Ask a question about your company docs (or type 'exit'): ")
    if question.lower() == "exit":
        break
    answer = qa.run(question)
    print("Answer:", answer)