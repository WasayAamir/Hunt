from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import applications, ai

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Hunt API",
    description="AI-Powered Job Hunt Command Center",
    version="0.1.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)
app.include_router(ai.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "hunt-api"}
