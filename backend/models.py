from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Enum as SQLEnum
from sqlalchemy.sql import func
from database import Base
import enum
import uuid


class ApplicationStatus(str, enum.Enum):
    SAVED = "saved"
    APPLIED = "applied"
    OA = "oa"
    INTERVIEW = "interview"
    OFFER = "offer"
    GHOSTED = "ghosted"
    REJECTED = "rejected"


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    status = Column(
        SQLEnum(ApplicationStatus),
        default=ApplicationStatus.SAVED,
        nullable=False,
    )
    description = Column(Text, nullable=True)
    requirements = Column(JSON, nullable=True)  # List of requirements from JD
    matched_skills = Column(JSON, nullable=True)  # Skills user has
    missing_skills = Column(JSON, nullable=True)  # Skill gaps
    resume_bullets = Column(JSON, nullable=True)  # AI-generated tailored bullets
    ats_score = Column(Integer, nullable=True)     # ATS keyword match score 0-100
    ats_breakdown = Column(JSON, nullable=True)    # Per-category ATS breakdown
    outreach_draft = Column(Text, nullable=True)  # AI-generated cold email
    notes = Column(Text, nullable=True)
    applied_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
