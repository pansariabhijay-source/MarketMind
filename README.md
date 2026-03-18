# MarketMind — AI Market Research Crew

A full-stack web app wrapping your CrewAI market research pipeline with a polished React frontend and FastAPI backend.

---

## Project Structure

```
crewai-market-research/
├── backend/
│   ├── crew.py              # Your CrewAI crew (unchanged)
│   ├── main.py              # FastAPI server
│   ├── config/
│   │   ├── agents.yaml      # Your agent configs
│   │   └── tasks.yaml       # Your task configs
│   ├── .env                 # API keys
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main app shell
    │   ├── api.js            # Backend API calls
    │   ├── hooks/useJob.js   # Job polling hook
    │   └── components/
    │       ├── AgentPipeline.jsx   # Live progress tracker
    │       ├── ReportViewer.jsx    # Markdown report viewer
    │       └── HistoryPanel.jsx    # Past runs sidebar
    ├── index.html
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Setup

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Add your API keys to .env
# GROQ_API_KEY=...
# SERPER_API_KEY=...

# Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs at: http://localhost:8000/docs

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | /api/run              | Start a new research run           |
| GET    | /api/status/{job_id}  | Poll job status + get report       |
| GET    | /api/history          | List all past runs                 |
| DELETE | /api/history          | Clear all history                  |
| GET    | /api/agents           | Get list of agents in pipeline     |
| GET    | /health               | Health check                       |

### POST /api/run — Request Body
```json
{ "product_idea": "AI-powered legal document review for SMBs" }
```

### GET /api/status/{job_id} — Response
```json
{
  "job_id": "uuid",
  "status": "running | completed | failed | pending",
  "product_idea": "...",
  "current_step": 2,
  "report": "# Market Research Report...",
  "created_at": "2024-01-01T00:00:00",
  "completed_at": "2024-01-01T00:05:00"
}
```

---

## How It Works

1. User enters a startup idea in the UI
2. Frontend `POST /api/run` → backend creates a job ID and spawns a background thread
3. CrewAI runs 6 agents sequentially (market research → fact check → competitive intel → customer insights → product strategy → business analysis)
4. Frontend polls `GET /api/status/{job_id}` every 2 seconds
5. Live agent pipeline UI updates as each step progresses
6. On completion, the full markdown report is rendered with copy + download options

---

## Production Deployment

For production, consider:
- **Backend**: Deploy on Railway, Render, or a VPS with `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Frontend**: `npm run build` → deploy `dist/` to Vercel or Netlify
- **Persistence**: Replace in-memory `jobs` dict with SQLite or Redis
- **Auth**: Add API key middleware to FastAPI if exposing publicly
