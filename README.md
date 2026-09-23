# ClarifyLegal — Understand & Compare Legal Documents

**ClarifyLegal** translates complex legal agreements, contracts, NDAs, and leases into clear, plain English. Powered by **NVIDIA NIM AI Foundation APIs (Meta Llama 3.2 Models)**, it offers document simplification, risk scoring, side-by-side version diffing, and grounded Q&A with strict in-memory privacy.

---

## 🌟 Architecture & Key Features

- **NVIDIA NIM AI Engine**: Powered by `meta/llama-3.2-11b-vision-instruct` via `https://integrate.api.nvidia.com/v1/chat/completions`.
- **Hybrid Deployment (Option A)**:
  - **Frontend**: React 18 + Vite SPA deployed on **Vercel** ([https://clarifylegal.vercel.app](https://clarifylegal.vercel.app)).
  - **Backend**: FastAPI persistent process hosted on **Render** for 0s cold starts, 100% reliable in-memory LRU caching, and sliding-window IP rate limiting.
- **Privacy First**: Zero file persistence. PDFs and raw text are parsed strictly in memory and discarded immediately.
- **Side-by-Side Version Comparison**: Visual diffing (red deleted vs. green added boxes), risk direction pills (`Risk Increased`, `Risk Decreased`), and copyable attorney questions.
- **Performance & Security**: Sentence-aligned text chunking, in-memory LRU caching, GZip compression, and per-IP rate limiting (15 req/min).

---

## 🚀 Environment Setup & Configuration

1. Copy `.env.example` to `backend/.env`:
   ```bash
   NVIDIA_API_KEY=nvapi-your_nvidia_api_key_here
   NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
   PORT=8000
   HOST=0.0.0.0
   CORS_ORIGINS=http://localhost:5173,https://clarifylegal.vercel.app
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🧪 Running Unit & Integration Tests

```bash
# Backend Pytest Suite
backend/venv/Scripts/python.exe -m pytest backend/tests

# Frontend Vitest Suite
cd frontend && npm run test
```

---

## 🔒 Security & Privacy Commitments

- `.env` files are strictly excluded via `.gitignore` and never committed.
- In-memory execution ensures zero persistent database logging.
- Mandatory legal disclaimers are automatically appended to all AI outputs.