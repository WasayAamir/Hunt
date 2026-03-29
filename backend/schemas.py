from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import ApplicationStatus


# --- Requests ---

class ParseJobRequest(BaseModel):
    url: str


class CreateApplicationRequest(BaseModel):
    company: str
    role: str
    url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.SAVED
    description: Optional[str] = None
    requirements: Optional[list[str]] = None
    notes: Optional[str] = None


class UpdateApplicationRequest(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    applied_date: Optional[datetime] = None


class GenerateBulletsRequest(BaseModel):
    application_id: str
    user_experience: str  # User's raw resume / experience summary


class ATSScanRequest(BaseModel):
    application_id: str
    resume_text: str


class ATSScanResponse(BaseModel):
    ats_score: int
    ats_breakdown: dict


class GenerateOutreachRequest(BaseModel):
    application_id: str
    user_name: str
    user_background: str  # Brief intro about the user


# --- Responses ---

class ParsedJobResponse(BaseModel):
    company: str
    role: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    description: str
    requirements: list[str]
    nice_to_haves: list[str]


class ApplicationResponse(BaseModel):
    id: str
    company: str
    role: str
    url: Optional[str]
    location: Optional[str]
    salary_range: Optional[str]
    status: ApplicationStatus
    description: Optional[str]
    requirements: Optional[list[str]]
    matched_skills: Optional[list[str]]
    missing_skills: Optional[list[str]]
    resume_bullets: Optional[list[str]]
    ats_score: Optional[int]
    ats_breakdown: Optional[dict]
    outreach_draft: Optional[str]
    notes: Optional[str]
    applied_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulletsResponse(BaseModel):
    bullets: list[str]
    skill_matches: list[str]
    skill_gaps: list[str]
    ats_score: int
    ats_breakdown: Optional[dict] = None


class OutreachResponse(BaseModel):
    subject: str
    body: str
