from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Application
from schemas import (
    ParseJobRequest,
    ParsedJobResponse,
    GenerateBulletsRequest,
    BulletsResponse,
    GenerateOutreachRequest,
    OutreachResponse,
    CreateApplicationRequest,
    ApplicationResponse,
)
from services.scraper import scrape_job_posting
from services.ai_service import (
    parse_job_description,
    generate_resume_bullets,
    generate_outreach_email,
)

router = APIRouter(prefix="/api", tags=["ai"])


@router.post("/parse-job", response_model=ApplicationResponse)
async def parse_job(req: ParseJobRequest, db: Session = Depends(get_db)):
    """Scrape a job URL, parse it with AI, and create an application entry."""
    try:
        raw_text = await scrape_job_posting(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")

    try:
        parsed = await parse_job_description(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse job: {str(e)}")

    # Create application from parsed data
    app = Application(
        company=parsed.get("company", "Unknown"),
        role=parsed.get("role", "Unknown"),
        url=req.url,
        location=parsed.get("location"),
        salary_range=parsed.get("salary_range"),
        description=parsed.get("description"),
        requirements=parsed.get("requirements", []),
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.post("/generate-bullets", response_model=BulletsResponse)
async def generate_bullets(req: GenerateBulletsRequest, db: Session = Depends(get_db)):
    """Generate tailored resume bullets for a tracked application."""
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    result = await generate_resume_bullets(
        job_requirements=app.requirements or [],
        job_description=app.description or "",
        user_experience=req.user_experience,
    )

    # Save results back to the application
    app.resume_bullets = result.get("bullets", [])
    app.matched_skills = result.get("skill_matches", [])
    app.missing_skills = result.get("skill_gaps", [])
    db.commit()

    return BulletsResponse(**result)


@router.post("/generate-outreach", response_model=OutreachResponse)
async def generate_outreach(
    req: GenerateOutreachRequest, db: Session = Depends(get_db)
):
    """Generate a cold outreach email for a tracked application."""
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    result = await generate_outreach_email(
        company=app.company,
        role=app.role,
        job_description=app.description or "",
        user_name=req.user_name,
        user_background=req.user_background,
    )

    # Save draft to application
    app.outreach_draft = result.get("body", "")
    db.commit()

    return OutreachResponse(**result)
