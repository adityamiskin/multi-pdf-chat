# PDF Chat App

This is a local chat app for querying PDFs using embeddings and a language model.

## Backend

We use **FastAPI** for the backend service. To set up:

```bash
cd backend
uv venv
uv pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API docs are available at `http://localhost:8000/docs`.

## Frontend

We use **Vite** + **React** + **TypeScript** + **Tailwind CSS** + **shadcn UI**.

```bash
cd frontend
pnpm i
pnpm run dev
```

Open `http://localhost:5173` in your browser.

## Features

- Upload PDFs to index their content.
- Semantic search over documents.
- Streaming chat responses via SSE.
- Persistent chat history and attachments.
