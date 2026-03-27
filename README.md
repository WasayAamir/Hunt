# Hunt 🎯

**AI-Powered Job Hunt Command Center**

Paste a job posting URL → get tailored resume bullets, cold outreach drafts, and a clean kanban board to track every application. Built for interns and new grads drowning in spreadsheets.

## Features

- **Paste & Parse** — Drop in a job URL and the AI extracts role, company, requirements, and key skills automatically
- **Smart Resume Tailoring** — Generates resume bullet points matched to each specific job description
- **Cold Outreach Drafts** — AI-written intro emails customized per role and company
- **Kanban Tracking** — Drag-and-drop board: Saved → Applied → OA → Interview → Offer → Ghosted
- **Skill Gap Analysis** — See what skills you're missing per role and across all your applications

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| AI | Anthropic Claude API (via Python SDK) |
| Infra | Docker, Docker Compose, AWS-ready |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional)
- Anthropic API key

### Quick Start

**1. Clone the repo**
```bash
git clone https://github.com/connectedf/hunt.git
cd hunt
```

**2. Backend setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Add your API keys
uvicorn main:app --reload
```

**3. Frontend setup**
```bash
cd frontend
npm install
cp .env.example .env.local  # Add backend URL
npm run dev
```

**4. Or use Docker Compose**
```bash
docker-compose up --build
```

Backend runs on `http://localhost:8000` · Frontend on `http://localhost:3000`

## Project Structure

```
hunt/
├── backend/
│   ├── main.py              # FastAPI app entrypoint
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # DB connection + session
│   ├── routers/
│   │   ├── applications.py  # CRUD for job applications
│   │   └── ai.py            # AI parsing + generation endpoints
│   └── services/
│       ├── scraper.py       # Job posting URL scraper
│       └── ai_service.py    # Claude API integration
├── frontend/
│   └── src/
│       ├── app/             # Next.js app router pages
│       ├── components/      # React components (Kanban, Cards, Modals)
│       └── lib/             # API client + utilities
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/parse-job` | Paste a URL, get structured job data |
| POST | `/api/applications` | Create a new tracked application |
| GET | `/api/applications` | List all applications |
| PATCH | `/api/applications/{id}` | Update status (drag between columns) |
| DELETE | `/api/applications/{id}` | Remove an application |
| POST | `/api/generate-bullets` | AI-tailored resume bullets for a job |
| POST | `/api/generate-outreach` | AI cold outreach email draft |

## Roadmap

- [ ] Chrome extension to parse job pages in one click
- [ ] Email integration for auto-detecting application confirmations
- [ ] Analytics dashboard (applications/week, response rates)
- [ ] Multi-resume support (different versions per role type)

## License

MIT
