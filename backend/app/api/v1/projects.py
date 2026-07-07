from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Project
from app.core.security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    display_name: str
    description: str | None = None

@router.post("/")
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    new_project = Project(
        clerk_user_id=user["clerk_user_id"],
        display_name=payload.display_name,
        description=payload.description
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return {
        "id": str(new_project.id),
        "display_name": new_project.display_name,
        "description": new_project.description,
        "created_at": new_project.created_at.isoformat()
    }

@router.get("/")
def list_projects(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    projects = db.query(Project).filter(Project.clerk_user_id == user["clerk_user_id"]).order_by(Project.created_at.desc()).all()
    return [
        {
            "id": str(p.id),
            "display_name": p.display_name,
            "description": p.description,
            "created_at": p.created_at.isoformat()
        } for p in projects
    ]