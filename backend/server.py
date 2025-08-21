from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (must only use env variables)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'test_database')
db = client[db_name]

# Create the main app without a prefix
app = FastAPI(title="AtlasCV API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# -----------------------
# Pydantic Models
# -----------------------
class ResumeContact(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    city: str = ""
    state: str = ""
    country: str = "India"
    linkedin: str = ""
    website: str = ""

class ResumeEducation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution: str = ""
    degree: str = ""
    start_date: str = ""  # YYYY-MM
    end_date: Optional[str] = None  # YYYY-MM or "Present"
    details: str = ""

class ResumeExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company: str = ""
    title: str = ""
    city: str = ""
    start_date: str = ""  # YYYY-MM
    end_date: Optional[str] = None  # YYYY-MM or "Present"
    bullets: List[str] = []

class ResumeProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    tech: List[str] = []
    link: str = ""

class Resume(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    locale: str = Field(default="IN")  # IN, US, EU, AU, JP-R, JP-S
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    contact: ResumeContact = ResumeContact()
    summary: str = ""
    skills: List[str] = []
    experience: List[ResumeExperience] = []
    education: List[ResumeEducation] = []
    projects: List[ResumeProject] = []
    extras: Dict[str, Any] = {}

class ResumeCreate(BaseModel):
    locale: Optional[str] = None
    contact: Optional[ResumeContact] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[ResumeExperience]] = None
    education: Optional[List[ResumeEducation]] = None
    projects: Optional[List[ResumeProject]] = None
    extras: Optional[Dict[str, Any]] = None

class ResumeUpdate(ResumeCreate):
    id: str

# -----------------------
# Minimal heuristic ATS score (no AI)
# -----------------------
BASIC_RULES_IN = {
    "required_sections": ["contact.full_name", "contact.email", "experience"],
    "phone_rule": "+",
    "max_pages": 2,
}

def compute_heuristic_score(resume: Resume) -> Dict[str, Any]:
    score = 100
    hints: List[str] = []
    # Required fields
    if not resume.contact.full_name.strip():
        hints.append("Add your full name in Contact.")
        score -= 20
    if not resume.contact.email.strip():
        hints.append("Add an email address.")
        score -= 20
    if len(resume.experience) == 0:
        hints.append("Add at least one experience entry.")
        score -= 25
    # India heuristics
    if resume.locale == "IN":
        if resume.contact.phone and not resume.contact.phone.strip().startswith("+"):
            hints.append("Include country code in phone (e.g., +91...).")
            score -= 5
    # Skills density
    if len(resume.skills) &lt; 5:
        hints.append("Add more relevant skills (aim for 8–12).")
        score -= 10
    # Bullet quality naive check
    bullet_len = sum(len(b) for e in resume.experience for b in e.bullets)
    if bullet_len &lt; 100:
        hints.append("Add quantified bullet points under experience.")
        score -= 10
    score = max(0, min(100, score))
    return {"score": score, "hints": hints}

# -----------------------
# Routes
# -----------------------
@api_router.get("/")
async def root():
    return {"message": "AtlasCV backend up"}

@api_router.get("/locales")
async def get_locales():
    return {
        "locales": [
            {"code": "US", "label": "United States"},
            {"code": "EU", "label": "European Union (Europass)"},
            {"code": "AU", "label": "Australia"},
            {"code": "IN", "label": "India"},
            {"code": "JP-R", "label": "Japan — Rirekisho"},
            {"code": "JP-S", "label": "Japan — Shokumu Keirekisho"},
        ]
    }

@api_router.post("/resumes", response_model=Resume)
async def create_resume(payload: ResumeCreate):
    data = Resume(**{k: v for k, v in payload.dict(exclude_none=True).items()})
    ats = compute_heuristic_score(data)
    doc = data.dict()
    doc["ats"] = ats
    await db.resumes.insert_one(doc)
    return Resume(**data.dict())

@api_router.put("/resumes/{resume_id}", response_model=Resume)
async def update_resume(resume_id: str, payload: ResumeCreate):
    existing = await db.resumes.find_one({"id": resume_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Resume not found")
    merged = {**existing, **payload.dict(exclude_none=True)}
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    data = Resume(**{k: v for k, v in merged.items() if k in Resume.model_fields})
    ats = compute_heuristic_score(data)
    merged["ats"] = ats
    await db.resumes.update_one({"id": resume_id}, {"$set": merged})
    return data

@api_router.get("/resumes/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str):
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    return Resume(**{k: v for k, v in found.items() if k in Resume.model_fields})

@api_router.post("/resumes/{resume_id}/score")
async def score_resume(resume_id: str):
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = Resume(**{k: v for k, v in found.items() if k in Resume.model_fields})
    return compute_heuristic_score(data)

# Include the router in the main app
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()