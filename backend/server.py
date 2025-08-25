from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import re
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt

# Import our privacy utilities
from encryption_utils import privacy_encryption
from gdpr_utils import GDPRCompliance

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (must only use env variables)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'test_database')
db = client[db_name]

# Initialize GDPR compliance helper
gdpr_compliance = GDPRCompliance(db)

# -----------------------
# Phase 10: Authentication Configuration
# -----------------------
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="AtlasCV API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# -----------------------
# Phase 10: Authentication Models
# -----------------------
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    role: str = "user"  # "user" or "admin"

class UserInDB(User):
    hashed_password: str

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1)

class UserSignin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None

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
    # Phase 9: Optional fields
    photo_url: Optional[str] = None  # Photo URL or base64
    date_of_birth: Optional[str] = None  # For locales that allow/require it

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

# Phase 9: New optional sections
class ResumeCertification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    issuer: str = ""
    issue_date: str = ""
    expiry_date: Optional[str] = None
    credential_id: str = ""
    credential_url: str = ""

class ResumeReference(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    title: str = ""
    company: str = ""
    email: str = ""
    phone: str = ""
    relationship: str = ""  # "Manager", "Colleague", "Professor", etc.

class ResumePersonalDetail(BaseModel):
    nationality: str = ""
    visa_status: str = ""
    languages: List[str] = []
    hobbies: List[str] = []
    volunteer_work: str = ""
    awards: List[str] = []

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
    # Phase 9: Optional sections
    certifications: List[ResumeCertification] = []
    references: List[ResumeReference] = []
    personal_details: Optional[ResumePersonalDetail] = None
    extras: Dict[str, Any] = {}

class ResumeCreate(BaseModel):
    locale: Optional[str] = None
    contact: Optional[ResumeContact] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[ResumeExperience]] = None
    education: Optional[List[ResumeEducation]] = None
    projects: Optional[List[ResumeProject]] = None
    # Phase 9: Optional sections
    certifications: Optional[List[ResumeCertification]] = None
    references: Optional[List[ResumeReference]] = None
    personal_details: Optional[ResumePersonalDetail] = None
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
# GDPR and Privacy Models
# -----------------------
class PrivacyConsentInput(BaseModel):
    user_identifier: str
    has_consent: bool = True
    version: str = "1.0"
    consent_types: List[str] = ["functional"]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class PrivacyConsentResult(BaseModel):
    user_identifier: str
    has_consent: bool
    consent_date: Optional[str]
    consent_version: str
    consent_types: List[str]

class DataExportRequest(BaseModel):
    user_identifier: str  # email or resume ID
    format: str = "json"  # json, csv (future)

class DataDeletionRequest(BaseModel):
    user_identifier: str  # email or resume ID
    confirmation_token: Optional[str] = None
    reason: Optional[str] = None

class LocalModeSettings(BaseModel):
    enabled: bool = False
    encrypt_local_data: bool = True
    auto_clear_after_hours: int = 24

# -----------------------
# Presets (field order, labels, date formats)
# -----------------------
PRESETS: Dict[str, Dict[str, Any]] = {
    "US": {
        "label": "United States",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects", "certifications"],
        "labels": {"experience": "Work Experience", "education": "Education"},
        "optional_fields": {
            "photo": False,  # Not allowed
            "date_of_birth": False,  # Not recommended
            "certifications": True,
            "references": True,  # "Available upon request" is standard
            "personal_details": False,
            "hobbies": False
        },
        "rules": [
            "No photo in resume",
            "Show city and state in Contact",
            "Use Month-Year dates (e.g., 2024-05)",
            "References available upon request",
        ],
    },
    "CA": {
        "label": "Canada",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects", "certifications"],
        "labels": {"experience": "Work Experience", "education": "Education"},
        "optional_fields": {
            "photo": False,  # Not recommended
            "date_of_birth": False,  # Prohibited for discrimination prevention
            "certifications": True,
            "references": True,
            "personal_details": True,  # Languages are important in Canada
            "hobbies": False
        },
        "rules": [
            "No photo required",
            "Bilingual capabilities (English/French) important",
            "Work permit status may be mentioned",
            "Include relevant certifications",
        ],
    },
    "EU": {
        "label": "European Union (Europass)",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects", "certifications", "personal_details"],
        "labels": {"experience": "Experience", "education": "Education (Europass)"},
        "optional_fields": {
            "photo": True,  # Optional but common
            "date_of_birth": True,  # Common in many EU countries
            "certifications": True,
            "references": True,
            "personal_details": True,  # Nationality, languages important
            "hobbies": True  # Personal interests section common
        },
        "rules": [
            "GDPR-friendly contact (avoid DOB unless asked)",
            "Optional photo toggle",
            "Languages section important for EU mobility",
            "Europass format compatibility",
        ],
    },
    "AU": {
        "label": "Australia",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "skills", "education", "projects", "certifications", "references"],
        "labels": {"experience": "Employment History", "references": "Referees"},
        "optional_fields": {
            "photo": False,  # Not recommended
            "date_of_birth": False,  # Not recommended
            "certifications": True,
            "references": True,  # Referees are standard
            "personal_details": True,  # Visa status important
            "hobbies": True  # Interests section common
        },
        "rules": [
            "2–3 pages acceptable",
            "Referees expected (usually 2-3)",
            "No photo",
            "Right-to-work statement optional",
            "Include visa status if relevant",
        ],
    },
    "IN": {
        "label": "India",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "skills", "experience", "projects", "education", "certifications", "personal_details"],
        "labels": {"experience": "Experience", "projects": "Projects (important)"},
        "optional_fields": {
            "photo": True,  # Optional but common
            "date_of_birth": True,  # Common in Indian resumes
            "certifications": True,
            "references": False,  # Not standard practice
            "personal_details": True,  # Languages, nationality important
            "hobbies": True  # Personal interests common
        },
        "rules": [
            "Phone should include country code (e.g., +91)",
            "Projects/internships prominent",
            "Certifications highly valued",
            "Personal details section standard",
        ],
    },
    "JP-R": {
        "label": "Japan — Rirekisho",
        "date_format": "YYYY/MM",
        "section_order": ["profile", "summary", "experience", "education", "skills", "projects", "certifications", "personal_details"],
        "labels": {"experience": "職歴 (Shokureki)", "education": "学歴 (Gakureki)"},
        "optional_fields": {
            "photo": True,  # Standard requirement
            "date_of_birth": True,  # Required
            "certifications": True,
            "references": False,  # Not standard
            "personal_details": True,  # Personal info important
            "hobbies": True  # 趣味 (Shumi) section standard
        },
        "rules": [
            "Structured, chronological",
            "Kana name field recommended",
            "Photo required (default ON)",
            "Date of birth standard",
            "Personal details section expected",
        ],
    },
    "JP-S": {
        "label": "Japan — Shokumu Keirekisho",
        "date_format": "YYYY/MM",
        "section_order": ["profile", "summary", "skills", "projects", "experience", "education", "certifications"],
        "labels": {"experience": "職務経歴", "skills": "スキルマトリクス"},
        "optional_fields": {
            "photo": False,  # Less common in skills-focused resume
            "date_of_birth": False,
            "certifications": True,
            "references": False,
            "personal_details": False,
            "hobbies": False
        },
        "rules": [
            "Narrative achievements",
            "Skills matrix and project details",
            "Focus on accomplishments over personal info",
        ],
    },
    "SG": {
        "label": "Singapore",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects", "certifications", "personal_details"],
        "labels": {"experience": "Work Experience", "education": "Education"},
        "optional_fields": {
            "photo": True,  # Optional but common
            "date_of_birth": True,  # Common practice
            "certifications": True,
            "references": True,
            "personal_details": True,  # Languages, nationality important
            "hobbies": False
        },
        "rules": [
            "Multilingual capabilities important",
            "Work permit status relevant",
            "Include relevant certifications",
            "Regional experience valued",
        ],
    },
    "AE": {
        "label": "United Arab Emirates",
        "date_format": "YYYY-MM",
        "section_order": ["profile", "jd", "summary", "experience", "education", "skills", "projects", "certifications", "personal_details"],
        "labels": {"experience": "Professional Experience", "education": "Educational Background"},
        "optional_fields": {
            "photo": True,  # Common practice
            "date_of_birth": True,
            "certifications": True,
            "references": True,
            "personal_details": True,  # Nationality, visa status crucial
            "hobbies": False
        },
        "rules": [
            "Visa status and nationality important",
            "Arabic/English language skills valued",
            "Regional/international experience highlighted",
            "Professional certifications important",
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

# -----------------------
# Phase 10: Authentication Utilities
# -----------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storing in database"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(email: str) -> Optional[UserInDB]:
    """Get user from database by email"""
    user_data = await db.users.find_one({"email": email})
    if user_data:
        return UserInDB(**user_data)
    return None

async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    """Authenticate user with email and password"""
    user = await get_user(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = await get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return User(**user.dict())

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# -----------------------
# Phase 10: Authentication API Endpoints
# -----------------------
@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserSignup):
    """Register a new user"""
    # Check if user already exists
    existing_user = await get_user(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password
    )
    
    # Save to database
    user_dict = user_in_db.dict()
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    # Return token and user info
    user = User(**user_in_db.dict())
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/signin", response_model=Token)
async def signin(user_credentials: UserSignin):
    """Authenticate user and return token"""
    user = await authenticate_user(user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Return token and user info
    user_response = User(**user.dict())
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@api_router.post("/auth/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_active_user)):
    """Refresh access token"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=current_user)

# -----------------------
# JD Processing API
# -----------------------
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

@api_router.get("/presets/{code}/optional-fields")
async def get_optional_fields(code: str):
    """Get optional field configuration for a specific locale"""
    if code not in PRESETS:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    preset = PRESETS[code]
    return {
        "locale": code,
        "optional_fields": preset.get("optional_fields", {}),
        "section_order": preset.get("section_order", []),
        "labels": preset.get("labels", {})
    }

@api_router.post("/validate", response_model=ValidateResult)
async def validate_resume(input: ValidateInput):
    r = input.resume
    code = r.locale if r.locale in PRESETS else "IN"
    preset = PRESETS[code]
    optional_fields = preset.get("optional_fields", {})
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

    # Phase 9: Optional field validations based on locale
    if r.contact.photo_url and not optional_fields.get("photo", True):
        issues.append(f"Photos are not recommended for {preset['label']} resumes")
    
    if r.contact.date_of_birth and not optional_fields.get("date_of_birth", True):
        issues.append(f"Date of birth not recommended for {preset['label']} resumes")
    
    # Japanese resumes typically require photo if JP-R
    if code == "JP-R" and not r.contact.photo_url:
        issues.append("Photo is typically required for Rirekisho format")

    # locale-specific quick rules
    if code == "US" or code == "CA":
        if not r.contact.state:
            issues.append(f"Add state/province in Contact for {preset['label']} resumes")
        if r.contact.photo_url:
            issues.append(f"Remove photo for {preset['label']} resumes (discrimination prevention)")
    
    if code == "IN":
        if r.contact.phone and not r.contact.phone.strip().startswith("+"):
            issues.append("Include +country code in phone (e.g., +91…)")
    
    if code in ["SG", "AE"]:
        if r.personal_details and not r.personal_details.nationality:
            issues.append(f"Nationality information important for {preset['label']} resumes")
    
    if code.startswith("JP"):
        if date_fmt != "YYYY/MM":
            issues.append("Japan presets use YYYY/MM date format")
    
    # Canada-specific validation
    if code == "CA" and r.personal_details:
        if "English" not in r.personal_details.languages and "French" not in r.personal_details.languages:
            issues.append("Consider mentioning English/French language proficiency for Canadian resumes")

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
            {"code": "CA", "label": "Canada"},
            {"code": "EU", "label": "European Union (Europass)"},
            {"code": "AU", "label": "Australia"},
            {"code": "IN", "label": "India"},
            {"code": "SG", "label": "Singapore"},
            {"code": "AE", "label": "United Arab Emirates"},
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
    
    # Encrypt sensitive fields before storing
    encrypted_doc = privacy_encryption.encrypt_sensitive_data(doc)
    await db.resumes.insert_one(encrypted_doc)
    
    return Resume(**data.dict())

@api_router.put("/resumes/{resume_id}", response_model=Resume)
async def update_resume(resume_id: str, payload: ResumeCreate):
    existing = await db.resumes.find_one({"id": resume_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Decrypt existing data for merging
    decrypted_existing = privacy_encryption.decrypt_sensitive_data(existing)
    
    merged = {**decrypted_existing, **payload.dict(exclude_none=True)}
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    data = Resume(**{k: v for k, v in merged.items() if k in Resume.model_fields})
    ats = compute_heuristic_score(data)
    merged["ats"] = ats
    
    # Encrypt before storing
    encrypted_merged = privacy_encryption.encrypt_sensitive_data(merged)
    await db.resumes.update_one({"id": resume_id}, {"$set": encrypted_merged})
    
    return data

@api_router.get("/resumes/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str):
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Decrypt sensitive data before returning
    decrypted_data = privacy_encryption.decrypt_sensitive_data(found)
    return Resume(**{k: v for k, v in decrypted_data.items() if k in Resume.model_fields})

@api_router.post("/resumes/{resume_id}/score")
async def score_resume(resume_id: str):
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Decrypt sensitive data for scoring
    decrypted_data = privacy_encryption.decrypt_sensitive_data(found)
    data = Resume(**{k: v for k, v in decrypted_data.items() if k in Resume.model_fields})
    return compute_heuristic_score(data)

# -----------------------
# GDPR and Privacy Compliance Routes
# -----------------------
@api_router.post("/gdpr/export-my-data")
async def export_user_data(request: DataExportRequest):
    """Export all user data for GDPR compliance"""
    try:
        export_data = await gdpr_compliance.export_user_data(request.user_identifier)
        return JSONResponse(
            content=export_data,
            headers={
                "Content-Disposition": f"attachment; filename=atlascv-data-export-{request.user_identifier}-{datetime.now().strftime('%Y%m%d')}.json"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/gdpr/delete-my-data")
async def delete_user_data(request: DataDeletionRequest):
    """Delete all user data for GDPR compliance"""
    try:
        deletion_result = await gdpr_compliance.delete_user_data(
            request.user_identifier, 
            request.confirmation_token
        )
        return deletion_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/privacy/consent", response_model=PrivacyConsentResult)
async def record_privacy_consent(request: PrivacyConsentInput):
    """Record user's privacy policy consent"""
    try:
        consent_record = await gdpr_compliance.record_privacy_consent(
            request.user_identifier, 
            request.dict()
        )
        return PrivacyConsentResult(**consent_record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/privacy/consent/{user_identifier}", response_model=PrivacyConsentResult)
async def get_privacy_consent(user_identifier: str):
    """Get user's privacy policy consent status"""
    try:
        consent_data = await gdpr_compliance.get_privacy_policy_acceptance(user_identifier)
        return PrivacyConsentResult(**consent_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/privacy/info/{resume_id}")
async def get_privacy_info(resume_id: str):
    """Get privacy information about stored resume data"""
    try:
        found = await db.resumes.find_one({"id": resume_id})
        if not found:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        privacy_info = privacy_encryption.get_privacy_info(found)
        return {
            "resume_id": resume_id,
            "privacy_info": privacy_info,
            "gdpr_rights": {
                "data_export": "Available via /api/gdpr/export-my-data",
                "data_deletion": "Available via /api/gdpr/delete-my-data",
                "data_portability": "JSON export format supported"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/local-mode/settings")
async def update_local_mode_settings(settings: LocalModeSettings):
    """Update local-only mode settings (frontend state management)"""
    return {
        "local_mode": settings.enabled,
        "encryption_enabled": settings.encrypt_local_data,
        "auto_clear_hours": settings.auto_clear_after_hours,
        "message": "Local mode settings updated. Data will be managed client-side.",
        "recommendations": [
            "Enable local encryption for sensitive data",
            "Consider periodic data export backups",
            "Be aware that local data may be lost on browser clear"
        ]
    }

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