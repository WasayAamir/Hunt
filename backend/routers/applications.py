from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Application, ApplicationStatus
from schemas import (
    CreateApplicationRequest,
    UpdateApplicationRequest,
    ApplicationResponse,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("/", response_model=list[ApplicationResponse])
def list_applications(status: ApplicationStatus | None = None, db: Session = Depends(get_db)):
    query = db.query(Application)
    if status:
        query = query.filter(Application.status == status)
    return query.order_by(Application.updated_at.desc()).all()


@router.post("/", response_model=ApplicationResponse, status_code=201)
def create_application(req: CreateApplicationRequest, db: Session = Depends(get_db)):
    app = Application(**req.model_dump())
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/{app_id}", response_model=ApplicationResponse)
def get_application(app_id: str, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{app_id}", response_model=ApplicationResponse)
def update_application(
    app_id: str, req: UpdateApplicationRequest, db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(app, key, value)

    db.commit()
    db.refresh(app)
    return app


@router.delete("/{app_id}", status_code=204)
def delete_application(app_id: str, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()
