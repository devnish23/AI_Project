from langchain.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredExcelLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OllamaEmbeddings
from langchain.vectorstores import Chroma
from langchain.llms import Ollama
from langchain.chains import RetrievalQA
import os

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

def load_and_update_docs(folder_path="company_docs"):
    documents = load_docs(folder_path)
    chunks = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50).split_documents(documents)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectordb = Chroma.from_documents(chunks, embedding=embeddings, persist_directory="chroma_db")
    vectordb.persist()
    return vectordb

def get_rag_chain():
    if not os.path.exists("chroma_db"):
        docs = load_docs("company_docs")
        chunks = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50).split_documents(docs)
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        vectordb = Chroma.from_documents(chunks, embedding=embeddings, persist_directory="chroma_db")
        vectordb.persist()
    else:
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        vectordb = Chroma(persist_directory="chroma_db", embedding_function=embeddings)

    llm = Ollama(model="mistral")
    qa = RetrievalQA.from_chain_type(llm=llm, retriever=vectordb.as_retriever())
    return qa
