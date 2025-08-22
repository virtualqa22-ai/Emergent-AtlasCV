from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
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
import re

# Import our privacy utilities
from .encryption_utils import privacy_encryption
from .gdpr_utils import GDPRCompliance

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (must only use env variables)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'test_database')
db = client[db_name]

# Initialize GDPR compliance helper
gdpr_compliance = GDPRCompliance(db)

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
    start_date: str = ""  # YYYY-MM or YYYY/MM per preset
    end_date: Optional[str] = None  # YYYY-MM/YYYY/MM or "Present"
    details: str = ""

class ResumeExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company: str = ""
    title: str = ""
    city: str = ""
    start_date: str = ""
    end_date: Optional[str] = None
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

class JDParseInput(BaseModel):
    text: str

class JDParseResult(BaseModel):
    keywords: List[str]
    top_keywords: List[str]

class CoverageInput(BaseModel):
    resume: Resume
    jd_keywords: List[str]

class SectionCoverage(BaseModel):
    coverage_percent: float
    matched: List[str]
    missing: List[str]
    frequency: Dict[str, int]

class CoverageResult(BaseModel):
    coverage_percent: float
    matched: List[str]
    missing: List[str]
    frequency: Dict[str, int]
    per_section: Dict[str, SectionCoverage]

class ValidateInput(BaseModel):
    resume: Resume

class ValidateResult(BaseModel):
    issues: List[str]
    locale: str

# -----------------------
# Presets (field order, labels, date formats)
# -----------------------
PRESETS: Dict[str, Dict[str, Any]] = {
    "US": {
        "label": "United States",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects"],
        "labels": {"experience": "Work Experience", "education": "Education"},
        "rules": [
            "No photo in resume",
            "Show city and state in Contact",
            "Use Month-Year dates (e.g., 2024-05)",
        ],
    },
    "EU": {
        "label": "European Union (Europass)",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects"],
        "labels": {"experience": "Experience", "education": "Education (Europass)"},
        "rules": [
            "GDPR-friendly contact (avoid DOB unless asked)",
            "Optional photo toggle",
        ],
    },
    "AU": {
        "label": "Australia",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "skills", "education", "projects"],
        "labels": {"experience": "Employment History"},
        "rules": [
            "2–3 pages acceptable",
            "Referees optional",
            "No photo",
            "Right-to-work statement optional",
        ],
    },
    "IN": {
        "label": "India",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "skills", "experience", "projects", "education"],
        "labels": {"experience": "Experience", "projects": "Projects (important)"},
        "rules": [
            "Phone should include country code (e.g., +91)",
            "Projects/internships prominent",
        ],
    },
    "JP-R": {
        "label": "Japan — Rirekisho",
        "date_format": "YYYY/MM",
        "section_order": ["profile", "summary", "experience", "education", "skills", "projects"],
        "labels": {"experience": "職歴 (Shokureki)", "education": "学歴 (Gakureki)"},
        "rules": [
            "Structured, chronological",
            "Kana name field recommended",
            "Optional photo toggle (default OFF)",
        ],
    },
    "JP-S": {
        "label": "Japan — Shokumu Keirekisho",
        "date_format": "YYYY/MM",
        "section_order": ["profile", "summary", "skills", "projects", "experience", "education"],
        "labels": {"experience": "職務経歴", "skills": "スキルマトリクス"},
        "rules": [
            "Narrative achievements",
            "Skills matrix and project details",
        ],
    },
}

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
    if len(resume.skills) < 5:
        hints.append("Add more relevant skills (aim for 8–12).")
        score -= 10
    # Bullet quality naive check
    bullet_len = sum(len(b) for e in resume.experience for b in e.bullets)
    if bullet_len < 100:
        hints.append("Add quantified bullet points under experience.")
        score -= 10
    score = max(0, min(100, score))
    return {"score": score, "hints": hints}

# -----------------------
# JD parsing and coverage (heuristic)
# -----------------------
STOPWORDS = set("""
a the and or for with of to in on by at from as is are be an – — & + / \n we our you your plus
""".split())

# stronger stemming rules (simple suffix reductions)
STEM_RULES = [
    (re.compile(r"ies$"), "y"),
    (re.compile(r"(xes|ses|zes|ches|shes)$"), "es"),
    (re.compile(r"ing$"), ""),
    (re.compile(r"ed$"), ""),
    (re.compile(r"es$"), ""),
    (re.compile(r"s$"), ""),
]

COMMON_SPLIT = re.compile(r"[^a-z0-9+#]+")

ALIAS_MAP = {
    "javascript": ["js"],
    "typescript": ["ts"],
    "react": ["reactjs", "react.js"],
    "node": ["nodejs", "node.js"],
    "aws": ["amazon web services"],
    "ml": ["machine learning"],
    "api": ["apis"],
    "rest": ["api", "apis"],
    "python": ["py"],
}

def normalize_token(t: str) -> str:
    t = t.lower().strip()
    for pat, repl in STEM_RULES:
        t = pat.sub(repl, t)
    return t

def expand_aliases(tokens: List[str]) -> List[str]:
    expanded = set(tokens)
    for base, al in ALIAS_MAP.items():
        if base in tokens:
            expanded.update(al)
        for a in al:
            if a in tokens:
                expanded.add(base)
    return list(expanded)

def tokenize(text: str) -> List[str]:
    parts = [normalize_token(p) for p in COMMON_SPLIT.split((text or "").lower()) if p]
    parts = [p for p in parts if p and p not in STOPWORDS and len(p) > 1]
    return parts

@api_router.post("/jd/parse", response_model=JDParseResult)
async def parse_jd(input: JDParseInput):
    parts = tokenize(input.text)
    freq: Dict[str, int] = {}
    for p in parts:
        freq[p] = freq.get(p, 0) + 1
    top = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:25]
    keywords = list({k for k, _ in top})
    keywords = expand_aliases(keywords)
    return JDParseResult(keywords=keywords, top_keywords=list({k for k, _ in top}))

@api_router.post("/jd/coverage", response_model=CoverageResult)
async def jd_coverage(input: CoverageInput):
    r = input.resume
    sections_text = {
        "summary": r.summary or "",
        "skills": " ".join(r.skills or []),
        "experience": " ".join([" ".join([e.company, e.title, e.city, e.start_date or "", e.end_date or ""]) + " " + " ".join(e.bullets or []) for e in r.experience]),
        "education": " ".join([" ".join([ed.institution, ed.degree, ed.details or ""]) for ed in r.education]),
        "projects": " ".join([" ".join([p.name, p.description or "", " ".join(p.tech or [])]) for p in r.projects]),
    }

    section_bags: Dict[str, Dict[str, int]] = {}
    for sec, text in sections_text.items():
        tokens = tokenize(text)
        bag: Dict[str, int] = {}
        for t in tokens:
            bag[t] = bag.get(t, 0) + 1
        section_bags[sec] = bag

    overall_bag: Dict[str, int] = {}
    for bag in section_bags.values():
        for t, c in bag.items():
            overall_bag[t] = overall_bag.get(t, 0) + c

    jd_norm = [normalize_token(k) for k in input.jd_keywords]
    jd_norm = [k for k in jd_norm if k]
    jd_norm = expand_aliases(jd_norm)
    unique_jd = sorted(list(set(jd_norm)))

    matched: List[str] = []
    missing: List[str] = []
    frequency: Dict[str, int] = {}
    for k in unique_jd:
        cnt = overall_bag.get(k, 0)
        if cnt > 0:
            matched.append(k)
            frequency[k] = cnt
        else:
            missing.append(k)

    overall_cov = round(100.0 * (len(matched) / len(unique_jd)) if unique_jd else 0, 1)

    per_section: Dict[str, SectionCoverage] = {}
    for sec, bag in section_bags.items():
        sec_matched: List[str] = []
        sec_missing: List[str] = []
        sec_freq: Dict[str, int] = {}
        for k in unique_jd:
            c = bag.get(k, 0)
            if c > 0:
                sec_matched.append(k)
                sec_freq[k] = c
            else:
                sec_missing.append(k)
        cov = round(100.0 * (len(sec_matched) / len(unique_jd)) if unique_jd else 0, 1)
        per_section[sec] = SectionCoverage(coverage_percent=cov, matched=sorted(list(set(sec_matched))), missing=sorted(list(set(sec_missing))), frequency=sec_freq)

    return CoverageResult(
        coverage_percent=overall_cov,
        matched=sorted(list(set(matched))),
        missing=sorted(list(set(missing))),
        frequency=frequency,
        per_section=per_section,
    )

# -----------------------
# Presets routes and validation
# -----------------------
@api_router.get("/presets")
async def get_presets():
    return {"presets": [{"code": k, **v} for k, v in PRESETS.items()]}

@api_router.get("/presets/{code}")
async def get_preset(code: str):
    if code not in PRESETS:
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"code": code, **PRESETS[code]}

@api_router.post("/validate", response_model=ValidateResult)
async def validate_resume(input: ValidateInput):
    r = input.resume
    code = r.locale if r.locale in PRESETS else "IN"
    preset = PRESETS[code]
    issues: List[str] = []

    # date format suggestion check
    date_fmt = preset.get("date_format", "YYYY-MM")
    date_sep = "/" if date_fmt == "YYYY/MM" else "-"

    def check_date(d: Optional[str]) -> bool:
        if not d:
            return True
        return (date_sep in d) and (len(d.split(date_sep)) == 2)

    for e in r.experience:
        if not check_date(e.start_date):
            issues.append(f"Use {date_fmt} for start_date in experience")
        if e.end_date and not check_date(e.end_date):
            issues.append(f"Use {date_fmt} for end_date in experience")

    for ed in r.education:
        if not check_date(ed.start_date):
            issues.append(f"Use {date_fmt} for start_date in education")
        if ed.end_date and not check_date(ed.end_date):
            issues.append(f"Use {date_fmt} for end_date in education")

    # locale-specific quick rules
    if code == "US":
        if not r.contact.state:
            issues.append("Add state in Contact for US resumes")
    if code == "IN":
        if r.contact.phone and not r.contact.phone.strip().startswith("+"):
            issues.append("Include +country code in phone (e.g., +91…)")
    if code.startswith("JP"):
        if date_fmt != "YYYY/MM":
            issues.append("Japan presets use YYYY/MM date format")

    return ValidateResult(issues=issues, locale=code)

# -----------------------
# Basic routes
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