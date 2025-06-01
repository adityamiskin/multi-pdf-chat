import json
import os
import uuid
from io import BytesIO

import chromadb
from chromadb.utils import embedding_functions
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from litellm import completion
from pydantic import BaseModel
from pypdf import PdfReader

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHAT_DIR = os.path.join(BASE_DIR, "data", "chats")
VECTOR_DIR = os.path.join(BASE_DIR, "data", "vectorstore")

os.makedirs(CHAT_DIR, exist_ok=True)
os.makedirs(VECTOR_DIR, exist_ok=True)

app = FastAPI(title="PDF Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

chroma_client = chromadb.PersistentClient(
    path=VECTOR_DIR,
)

embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
collection = chroma_client.get_or_create_collection(
    name="documents",
    embedding_function=embedding_fn,
)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def get_chat_path(chat_id: str):
    return os.path.join(CHAT_DIR, f"{chat_id}.json")


def load_chat(chat_id: str):
    path = get_chat_path(chat_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Chat not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_chat(chat_data: dict):
    path = get_chat_path(chat_data["chat_id"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(chat_data, f, ensure_ascii=False, indent=2)


@app.post("/api/chats")
def create_chat():
    chat_id = str(uuid.uuid4())
    chat_data = {"chat_id": chat_id, "messages": [], "attachments": []}
    save_chat(chat_data)
    return {"chat_id": chat_id}


@app.get("/api/chats")
def list_chats():
    chats = []
    for fname in os.listdir(CHAT_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(CHAT_DIR, fname), "r", encoding="utf-8") as f:
                chats.append(json.load(f))
    return chats


@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str):
    return load_chat(chat_id)


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str):
    chat_path = get_chat_path(chat_id)
    if not os.path.exists(chat_path):
        raise HTTPException(status_code=404, detail="Chat not found")

    # Delete chat file
    os.remove(chat_path)

    # Delete associated documents from vector store
    try:
        collection.delete(where={"chat_id": chat_id})
    except Exception:
        # Continue even if vector deletion fails
        pass

    return {"status": "deleted"}


@app.post("/api/chats/{chat_id}/upload")
async def upload_pdf(chat_id: str, file: UploadFile = File(...)):
    chat_data = load_chat(chat_id)
    content = await file.read()
    reader = PdfReader(BytesIO(content))
    text = "".join([page.extract_text() or "" for page in reader.pages])
    chunks = chunk_text(text)
    for idx, chunk in enumerate(chunks):
        doc_id = f"{chat_id}-{file.filename}-{idx}"
        metadata = {"chat_id": chat_id, "source": file.filename}
        collection.add(
            documents=[chunk],
            metadatas=[metadata],
            ids=[doc_id],
        )
    if file.filename not in chat_data["attachments"]:
        chat_data["attachments"].append(file.filename)
        save_chat(chat_data)
    return {"status": "ok", "chunks": len(chunks)}


class QueryRequest(BaseModel):
    query: str


@app.post("/api/chats/{chat_id}/query")
async def query_chat(chat_id: str, body: QueryRequest = Body(...)):
    query = body.query
    chat_data = load_chat(chat_id)
    results = collection.query(
        query_texts=[query],
        n_results=3,
        where={"chat_id": chat_id},
    )
    docs = results["documents"][0]
    metadatas = results["metadatas"][0]
    messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant. Answer the question based on the provided context and include sources.",
        },
        {"role": "system", "content": "Context:\n" + "\n\n".join(docs)},
        {"role": "user", "content": query},
    ]
    model_name = os.environ.get("LITELLM_MODEL", "gpt-4.1-nano")

    def event_stream():
        chat_data["messages"].append({"role": "user", "content": query})
        save_chat(chat_data)
        resp_text = ""
        for chunk in completion(model=model_name, messages=messages, stream=True):
            token = chunk["choices"][0]["delta"].get("content", "")
            if token:
                resp_text += token
                yield token
        chat_data_updated = load_chat(chat_id)
        chat_data_updated["messages"].append({"role": "assistant", "content": resp_text, "sources": metadatas})
        save_chat(chat_data_updated)

    return StreamingResponse(event_stream(), media_type="text/plain")
