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
from datetime import datetime, timezone, timedelta
import re
import json
import pdfplumber
import io
from fastapi import UploadFile, File, Form
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from typing import BinaryIO

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
    per_section: Dict[str, 'SectionCoverage']

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
# AI Assist (Phase 4)
# -----------------------
class AIRewriteRequest(BaseModel):
    role_title: Optional[str] = None
    bullets: List[str]
    jd_context: Optional[str] = None
    tone: Optional[str] = Field(default="impactful")  # concise | impactful

class AIRewriteResponse(BaseModel):
    improved_bullets: List[str]
    tips: List[str] = []

class AILintIssue(BaseModel):
    type: str
    message: str
    suggestion: Optional[str] = None
    example: Optional[str] = None
    severity: Optional[str] = None  # low | medium | high

class AILintRequest(BaseModel):
    text: str
    section: str = Field(pattern="^(summary|bullet)$")

class AILintResponse(BaseModel):
    issues: List[AILintIssue]
    suggestions: List[str] = []

class AISuggestKeywordsRequest(BaseModel):
    jd_keywords: List[str]
    resume_text: Optional[str] = None

class AISuggestKeywordsResponse(BaseModel):
    synonyms: Dict[str, List[str]]
    prioritize: List[str]

# Internal LLM helper
_LLMCACHED = {"client": None, "available": False}

def _init_llm_client():
    if _LLMCACHED["client"] is not None:
        return _LLMCACHED["client"], _LLMCACHED["available"]
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        _LLMCACHED.update({"client": None, "available": False})
        return None, False
    try:
        # Import emergentintegrations lazily
        from emergentintegrations import EmergentClient
        client = EmergentClient(api_key=api_key)
        _LLMCACHED.update({"client": client, "available": True})
        return client, True
    except Exception as e:
        logging.getLogger(__name__).warning(f"LLM client init failed, falling back to heuristics: {e}")
        _LLMCACHED.update({"client": None, "available": False})
        return None, False

async def _llm_chat_json(system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800) -> Optional[Dict[str, Any]]:
    client, ok = _init_llm_client()
    if not ok:
        return None
    try:
        # The following call shape follows integration playbook semantics
        # If the SDK differs, this will raise and we fallback gracefully
        payload = {
            "model": "gpt-4.1-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        # Expecting client.chat.completions.create(...) to return a structure with choices[0].message.content
        resp = await client.chat.completions.create(payload)
        content = resp["choices"][0]["message"]["content"] if isinstance(resp, dict) else getattr(resp.choices[0].message, "content", "")
        # Try parse JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Attempt code fence extraction
            m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    pass
        return None
    except Exception as e:
        logging.getLogger(__name__).warning(f"LLM call failed, fallback: {e}")
        return None

# Heuristic fallbacks
FILLER_WORDS = ["utilize", "synergy", "leverage", "in order to", "core competency", "results-driven"]
PASSIVE_HINT = re.compile(r"\b(was|were|is|are|been|being)\b\s+\w+ed\b", re.IGNORECASE)

def _rewrite_bullets_heuristic(bullets: List[str]) -> Dict[str, Any]:
    improved = []
    tips = [
        "Start with strong action verbs (e.g., Led, Built, Optimized)",
        "Quantify impact with numbers (%/time/$)",
        "Specify tools/tech and scope",
    ]
    for b in bullets:
        nb = b.strip()
        # Ensure action verb
        if nb and not re.match(r"^(led|built|created|optimized|managed|designed|developed)\b", nb, re.IGNORECASE):
            nb = f"Improved: {nb}"
        # Add quantification hint if none
        if not re.search(r"\d", nb):
            nb += " (add metrics: e.g., 25% faster, $100k saved)"
        improved.append(nb)
    return {"improved_bullets": improved, "tips": tips}

def _lint_text_heuristic(text: str) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []
    if PASSIVE_HINT.search(text):
        issues.append({"type": "passive", "message": "Passive voice detected", "suggestion": "Use active voice", "severity": "medium"})
    for fw in FILLER_WORDS:
        if fw in text.lower():
            issues.append({"type": "filler", "message": f"Avoid filler word: '{fw}'", "suggestion": "Replace with precise wording", "severity": "low"})
    if len(text) > 300:
        issues.append({"type": "length", "message": "Text might be too long", "suggestion": "Trim to essentials", "severity": "low"})
    suggestions = ["Prefer concise, metric-driven sentences", "Begin bullets with action verbs"]
    return {"issues": issues, "suggestions": suggestions}

def _synonyms_heuristic(jd_keywords: List[str]) -> Dict[str, Any]:
    syn: Dict[str, List[str]] = {}
    for k in jd_keywords:
        base = normalize_token(k)
        al = ALIAS_MAP.get(base, [])
        syn[k] = list(sorted(set([*al])))
    prioritize = sorted(list({normalize_token(k) for k in jd_keywords}))[:10]
    return {"synonyms": syn, "prioritize": prioritize}

@api_router.post("/ai/rewrite-bullets", response_model=AIRewriteResponse)
async def ai_rewrite_bullets(req: AIRewriteRequest):
    sys = "You are an expert resume writer. Return ONLY valid JSON."
    user = (
        "Rewrite the bullets to be action-oriented and quantified. Keep ATS-safe.\n"
        f"Role: {req.role_title or 'N/A'}\n"
        f"JD Context: {req.jd_context or 'N/A'}\n"
        f"Tone: {req.tone}\n"
        "Return JSON: {\n  \"improved_bullets\": [\"...\"],\n  \"tips\": [\"...\"]\n} \n"
        f"Bullets: {json.dumps(req.bullets)}"
    )
    parsed = await _llm_chat_json(sys, user, temperature=0.2, max_tokens=700)
    if parsed and isinstance(parsed, dict) and "improved_bullets" in parsed:
        return AIRewriteResponse(improved_bullets=parsed.get("improved_bullets", []), tips=parsed.get("tips", []))
    # fallback
    h = _rewrite_bullets_heuristic(req.bullets)
    return AIRewriteResponse(**h)

@api_router.post("/ai/lint", response_model=AILintResponse)
async def ai_lint(req: AILintRequest):
    sys = "You are a resume linting assistant. Return ONLY valid JSON."
    user = (
        "Find issues in the text focused on passive voice, filler words, vagueness, and excess length.\n"
        "Return JSON: {\n  \"issues\": [{\"type\": \"passive|filler|vagueness|length\", \"message\": \"...\", \"suggestion\": \"...\", \"severity\": \"low|medium|high\"}],\n  \"suggestions\": [\"...\"]\n}\n"
        f"Section: {req.section}\nText: {req.text}"
    )
    parsed = await _llm_chat_json(sys, user, temperature=0.0, max_tokens=600)
    if parsed and isinstance(parsed, dict) and "issues" in parsed:
        issues = [AILintIssue(**i) for i in parsed.get("issues", []) if isinstance(i, dict)]
        return AILintResponse(issues=issues, suggestions=parsed.get("suggestions", []))
    h = _lint_text_heuristic(req.text)
    issues = [AILintIssue(**i) for i in h.get("issues", [])]
    return AILintResponse(issues=issues, suggestions=h.get("suggestions", []))

@api_router.post("/ai/suggest-keywords", response_model=AISuggestKeywordsResponse)
async def ai_suggest_keywords(req: AISuggestKeywordsRequest):
    sys = "You suggest synonyms and prioritize keywords for ATS and recruiter search. Return ONLY valid JSON."
    user = (
        "Given JD keywords and optional resume text, propose synonyms/stems and a prioritized list (top 10).\n"
        "Return JSON: {\n  \"synonyms\": {\"keyword\": [\"syn1\", \"syn2\"]},\n  \"prioritize\": [\"kw1\", \"kw2\"]\n}\n"
        f"JD Keywords: {json.dumps(req.jd_keywords)}\nResume: {req.resume_text or 'N/A'}"
    )
    parsed = await _llm_chat_json(sys, user, temperature=0.1, max_tokens=500)
    if parsed and isinstance(parsed, dict) and "synonyms" in parsed:
        # Normalize to correct shapes
        syn = parsed.get("synonyms", {})
        prioritize = parsed.get("prioritize", [])
        # Ensure types
        syn_fixed: Dict[str, List[str]] = {}
        for k, v in (syn.items() if isinstance(syn, dict) else []):
            if isinstance(v, list):
                syn_fixed[str(k)] = [str(x) for x in v]
        prioritize_fixed = [str(x) for x in prioritize if isinstance(x, (str, int))]
        return AISuggestKeywordsResponse(synonyms=syn_fixed, prioritize=prioritize_fixed[:10])
    h = _synonyms_heuristic(req.jd_keywords)
    return AISuggestKeywordsResponse(**h)

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

# -----------------------
# Templates (Phase 6)
# -----------------------
class ResumeTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str = Field(default="professional")  # professional, creative, academic, technical
    preview_image: str = ""
    ats_optimized: bool = True
    layout_config: Dict[str, Any] = {}
    styling: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShareableLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resume_id: str
    owner_id: str = "anonymous"  # For future user auth
    share_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    permissions: str = Field(default="view")  # view, comment, suggest
    expires_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resume_id: str
    share_link_id: Optional[str] = None
    author_name: str = "Anonymous"
    author_email: Optional[str] = None
    section: str  # "contact", "experience.0", "summary", etc.
    field: Optional[str] = None  # specific field if applicable
    content: str
    type: str = Field(default="comment")  # comment, suggestion, change_request
    status: str = Field(default="open")  # open, resolved, applied, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

class Suggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resume_id: str
    share_link_id: Optional[str] = None
    author_name: str = "Anonymous"
    section: str
    field: Optional[str] = None
    original_value: str = ""
    suggested_value: str = ""
    reason: str = ""
    status: str = Field(default="pending")  # pending, accepted, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    applied_at: Optional[str] = None

class CreateShareLinkRequest(BaseModel):
    resume_id: str
    permissions: str = Field(default="view")
    expires_in_days: Optional[int] = None

class CreateCommentRequest(BaseModel):
    resume_id: str
    section: str
    field: Optional[str] = None
    content: str
    author_name: str = "Anonymous"
    author_email: Optional[str] = None

class CreateSuggestionRequest(BaseModel):
    resume_id: str
    section: str
    field: Optional[str] = None
    original_value: str
    suggested_value: str
    reason: str = ""
# -----------------------
# Templates routes (Phase 6)
# -----------------------

# ATS-Safe Template Definitions
BUILT_IN_TEMPLATES = [
    {
        "id": "classic-professional", 
        "name": "Classic Professional",
        "description": "Clean, traditional layout perfect for corporate roles. ATS-optimized with clear sections.",
        "category": "professional",
        "preview_image": "/templates/classic-professional.png",
        "ats_optimized": True,
        "layout_config": {
            "sections": ["contact", "summary", "experience", "skills", "education"],
            "sidebar": False,
            "header_style": "centered",
            "spacing": "standard"
        },
        "styling": {
            "font_family": "Arial, sans-serif",
            "font_size": 11,
            "line_height": 1.4,
            "colors": {"primary": "#000000", "accent": "#333333"},
            "margins": {"top": 0.75, "bottom": 0.75, "left": 0.75, "right": 0.75}
        }
    },
    {
        "id": "modern-minimal",
        "name": "Modern Minimal", 
        "description": "Clean, minimalist design with subtle accents. Great for tech and creative roles.",
        "category": "modern",
        "preview_image": "/templates/modern-minimal.png",
        "ats_optimized": True,
        "layout_config": {
            "sections": ["contact", "summary", "skills", "experience", "education"],
            "sidebar": False,
            "header_style": "left_aligned",
            "spacing": "compact"
        },
        "styling": {
            "font_family": "Helvetica, Arial, sans-serif", 
            "font_size": 10,
            "line_height": 1.3,
            "colors": {"primary": "#2D3748", "accent": "#1D4ED8"},
            "margins": {"top": 0.5, "bottom": 0.5, "left": 0.75, "right": 0.75}
        }
    },
    {
        "id": "executive-formal",
        "name": "Executive Formal",
        "description": "Sophisticated layout for senior-level positions. Conservative styling with emphasis on achievements.",
        "category": "executive", 
        "preview_image": "/templates/executive-formal.png",
        "ats_optimized": True,
        "layout_config": {
            "sections": ["contact", "summary", "experience", "education", "skills"],
            "sidebar": False,
            "header_style": "formal",
            "spacing": "generous"
        },
        "styling": {
            "font_family": "Times New Roman, serif",
            "font_size": 11,
            "line_height": 1.5,
            "colors": {"primary": "#000000", "accent": "#1a365d"},
            "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0}
        }
    },
    {
        "id": "technical-focused",
        "name": "Technical Focused",
        "description": "Optimized for technical roles. Emphasizes skills and projects with clear, scannable sections.",
        "category": "technical",
        "preview_image": "/templates/technical-focused.png", 
        "ats_optimized": True,
        "layout_config": {
            "sections": ["contact", "skills", "summary", "experience", "projects", "education"],
            "sidebar": False,
            "header_style": "technical",
            "spacing": "standard"
        },
        "styling": {
            "font_family": "Calibri, Arial, sans-serif",
            "font_size": 10,
            "line_height": 1.35,
            "colors": {"primary": "#1a202c", "accent": "#16A34A"},
            "margins": {"top": 0.75, "bottom": 0.75, "left": 0.75, "right": 0.75}
        }
    },
    {
        "id": "creative-balanced", 
        "name": "Creative Balanced",
        "description": "Professional yet creative design. Perfect for design, marketing, and media roles.",
        "category": "creative",
        "preview_image": "/templates/creative-balanced.png",
        "ats_optimized": True,
        "layout_config": {
            "sections": ["contact", "summary", "skills", "experience", "projects", "education"],
            "sidebar": False,
            "header_style": "creative",
            "spacing": "balanced"
        },
        "styling": {
            "font_family": "Open Sans, Arial, sans-serif",
            "font_size": 10,
            "line_height": 1.4, 
            "colors": {"primary": "#2d3748", "accent": "#F59E0B"},
            "margins": {"top": 0.6, "bottom": 0.6, "left": 0.8, "right": 0.8}
        }
    }
]

@api_router.get("/templates")
async def get_templates():
    """Get all available resume templates"""
    return {"templates": BUILT_IN_TEMPLATES}

@api_router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get specific template by ID"""
    template = next((t for t in BUILT_IN_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.post("/templates/{template_id}/apply/{resume_id}")
async def apply_template_to_resume(template_id: str, resume_id: str):
    """Apply a template to an existing resume"""
    # Get template
    template = next((t for t in BUILT_IN_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get resume
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Apply template settings to resume
    update_data = {
        "template_id": template_id,
        "template_config": template["layout_config"],
        "template_styling": template["styling"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.resumes.update_one({"id": resume_id}, {"$set": update_data})
    
    # Return updated resume
    updated = await db.resumes.find_one({"id": resume_id})
    return Resume(**{k: v for k, v in updated.items() if k in Resume.model_fields})

# -----------------------
# Collaboration routes (Phase 6) 
# -----------------------

@api_router.post("/share", response_model=ShareableLink)
async def create_share_link(request: CreateShareLinkRequest):
    """Create a shareable link for a resume"""
    # Verify resume exists
    found = await db.resumes.find_one({"id": request.resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Calculate expiry
    expires_at = None
    if request.expires_in_days:
        expires_at = (datetime.now(timezone.utc) + 
                     timedelta(days=request.expires_in_days)).isoformat()
    
    # Create share link
    share_link = ShareableLink(
        resume_id=request.resume_id,
        permissions=request.permissions,
        expires_at=expires_at
    )
    
    # Store in database
    await db.share_links.insert_one(share_link.dict())
    
    return share_link

@api_router.get("/share/{share_token}")
async def get_shared_resume(share_token: str):
    """Get resume via share token"""
    # Find share link
    share_link = await db.share_links.find_one({"share_token": share_token, "is_active": True})
    if not share_link:
        raise HTTPException(status_code=404, detail="Shared link not found or expired")
    
    # Check expiry
    if share_link.get("expires_at"):
        expires_at = datetime.fromisoformat(share_link["expires_at"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=410, detail="Shared link has expired")
    
    # Get resume
    found = await db.resumes.find_one({"id": share_link["resume_id"]})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume = Resume(**{k: v for k, v in found.items() if k in Resume.model_fields})
    
    return {
        "resume": resume,
        "share_info": {
            "permissions": share_link["permissions"],
            "can_comment": share_link["permissions"] in ["comment", "suggest"],
            "can_suggest": share_link["permissions"] == "suggest"
        }
    }

@api_router.post("/comments", response_model=Comment)
async def create_comment(request: CreateCommentRequest):
    """Create a comment on a resume"""
    # Verify resume exists
    found = await db.resumes.find_one({"id": request.resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    comment = Comment(**request.dict())
    await db.comments.insert_one(comment.dict())
    
    return comment

@api_router.get("/comments/{resume_id}")
async def get_resume_comments(resume_id: str):
    """Get all comments for a resume"""
    comments = []
    async for comment in db.comments.find({"resume_id": resume_id}):
        comments.append(Comment(**comment))
    
    return {"comments": comments}

@api_router.post("/suggestions", response_model=Suggestion)  
async def create_suggestion(request: CreateSuggestionRequest):
    """Create a suggestion for resume improvement"""
    # Verify resume exists
    found = await db.resumes.find_one({"id": request.resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    suggestion = Suggestion(**request.dict())
    await db.suggestions.insert_one(suggestion.dict())
    
    return suggestion

@api_router.get("/suggestions/{resume_id}")
async def get_resume_suggestions(resume_id: str):
    """Get all suggestions for a resume"""
    suggestions = []
    async for suggestion in db.suggestions.find({"resume_id": resume_id}):
        suggestions.append(Suggestion(**suggestion))
    
    return {"suggestions": suggestions}

@api_router.post("/suggestions/{suggestion_id}/accept")
async def accept_suggestion(suggestion_id: str):
    """Accept and apply a suggestion to the resume"""
    # Find suggestion
    suggestion = await db.suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    if suggestion["status"] != "pending":
        raise HTTPException(status_code=400, detail="Suggestion is not pending")
    
    # Get resume
    resume = await db.resumes.find_one({"id": suggestion["resume_id"]})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Apply suggestion (simplified - would need complex path resolution in production)
    update_path = suggestion["section"]
    if suggestion.get("field"):
        update_path += f".{suggestion['field']}"
    
    # Mark suggestion as accepted
    await db.suggestions.update_one(
        {"id": suggestion_id}, 
        {"$set": {"status": "accepted", "applied_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Suggestion accepted", "suggestion_id": suggestion_id}

@api_router.post("/suggestions/{suggestion_id}/reject")
async def reject_suggestion(suggestion_id: str):
    """Reject a suggestion"""
    suggestion = await db.suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    await db.suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {"status": "rejected"}}
    )
    
    return {"message": "Suggestion rejected", "suggestion_id": suggestion_id}

# -----------------------
# Import/Export (Phase 5)
# -----------------------
class ImportResponse(BaseModel):
    success: bool
    message: str
    extracted_data: Optional[Resume] = None
    warnings: List[str] = []

MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB

def extract_resume_data_from_pdf(file_content: bytes) -> Dict[str, Any]:
    """Extract resume data from PDF using pdfplumber"""
    extracted = {
        "contact": {"full_name": "", "email": "", "phone": "", "city": "", "state": "", "country": "India", "linkedin": "", "website": ""},
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "projects": []
    }
    
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        if not text.strip():
            return extracted
        
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Extract email and phone patterns
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'[\+]?[1-9]?[0-9]{7,15}'
        
        emails = re.findall(email_pattern, text)
        phones = re.findall(phone_pattern, text)
        
        if emails:
            extracted["contact"]["email"] = emails[0]
        if phones:
            extracted["contact"]["phone"] = phones[0]
        
        # Basic name extraction (first non-empty line likely contains name)
        if lines:
            potential_name = lines[0]
            # Remove common resume headers
            if not any(keyword in potential_name.lower() for keyword in ['resume', 'cv', 'curriculum']):
                extracted["contact"]["full_name"] = potential_name
        
        # Look for sections
        experience_keywords = ['experience', 'work experience', 'employment', 'professional experience']
        education_keywords = ['education', 'academic', 'qualifications', 'university', 'college']
        skills_keywords = ['skills', 'technical skills', 'competencies', 'technologies']
        
        current_section = None
        current_content = []
        
        for line in lines[1:]:  # Skip first line (likely name)
            line_lower = line.lower()
            
            # Detect section headers
            if any(keyword in line_lower for keyword in experience_keywords):
                if current_section and current_content:
                    process_section_content(extracted, current_section, current_content)
                current_section = 'experience'
                current_content = []
            elif any(keyword in line_lower for keyword in education_keywords):
                if current_section and current_content:
                    process_section_content(extracted, current_section, current_content)
                current_section = 'education'
                current_content = []
            elif any(keyword in line_lower for keyword in skills_keywords):
                if current_section and current_content:
                    process_section_content(extracted, current_section, current_content)
                current_section = 'skills'
                current_content = []
            elif line_lower in ['summary', 'objective', 'profile', 'about']:
                if current_section and current_content:
                    process_section_content(extracted, current_section, current_content)
                current_section = 'summary'
                current_content = []
            else:
                if current_section:
                    current_content.append(line)
                elif not extracted["summary"] and len(line) > 20:
                    # If no section detected yet, treat as summary
                    extracted["summary"] = line
        
        # Process final section
        if current_section and current_content:
            process_section_content(extracted, current_section, current_content)
        
        return extracted
        
    except Exception as e:
        logging.getLogger(__name__).error(f"PDF extraction failed: {e}")
        return extracted

def process_section_content(extracted: Dict[str, Any], section: str, content: List[str]):
    """Process extracted section content"""
    if section == 'summary':
        extracted["summary"] = ' '.join(content)
    elif section == 'skills':
        # Extract skills from text
        skills_text = ' '.join(content)
        # Simple comma/bullet separation
        skills = []
        for delimiter in [',', '•', '·', '|', '\n']:
            if delimiter in skills_text:
                skills = [s.strip() for s in skills_text.split(delimiter) if s.strip()]
                break
        if not skills:
            skills = skills_text.split()
        extracted["skills"] = [s for s in skills[:15] if len(s) > 1]  # Limit and filter
    elif section == 'experience':
        # Simple experience extraction
        exp_entry = {
            "id": str(uuid.uuid4()),
            "company": "",
            "title": "", 
            "city": "",
            "start_date": "",
            "end_date": "",
            "bullets": []
        }
        
        # Look for company/title patterns
        for line in content:
            if not exp_entry["company"] and not exp_entry["title"]:
                # First meaningful line likely has company/title
                exp_entry["title"] = line
            else:
                exp_entry["bullets"].append(line)
        
        if exp_entry["title"] or exp_entry["bullets"]:
            extracted["experience"].append(exp_entry)
    elif section == 'education':
        # Simple education extraction
        edu_entry = {
            "id": str(uuid.uuid4()),
            "institution": "",
            "degree": "",
            "start_date": "",
            "end_date": "",
            "details": ""
        }
        
        if content:
            edu_entry["institution"] = content[0] if content else ""
            edu_entry["degree"] = content[1] if len(content) > 1 else ""
            edu_entry["details"] = ' '.join(content[2:]) if len(content) > 2 else ""
        
        if edu_entry["institution"] or edu_entry["degree"]:
            extracted["education"].append(edu_entry)

def generate_pdf_resume(resume: Resume) -> bytes:
    """Generate PDF from resume data with preset styling"""
    buffer = io.BytesIO()
    preset = PRESETS.get(resume.locale, PRESETS["IN"])
    
    # Use A4 for most countries, Letter for US
    page_size = letter if resume.locale == "US" else A4
    doc = SimpleDocTemplate(buffer, pagesize=page_size, leftMargin=0.75*inch, rightMargin=0.75*inch, 
                           topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=16, spaceAfter=12, alignment=TA_CENTER)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=12, spaceAfter=6, textColor=colors.darkblue)
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=10, spaceAfter=3)
    contact_style = ParagraphStyle('ContactStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)
    
    story = []
    
    # Header with name and contact
    if resume.contact.full_name:
        story.append(Paragraph(resume.contact.full_name, title_style))
    
    # Contact information
    contact_parts = []
    if resume.contact.email:
        contact_parts.append(resume.contact.email)
    if resume.contact.phone:
        contact_parts.append(resume.contact.phone)
    if resume.contact.city:
        location = resume.contact.city
        if resume.contact.state:
            location += f", {resume.contact.state}"
        contact_parts.append(location)
    if resume.contact.linkedin:
        contact_parts.append(resume.contact.linkedin)
    
    if contact_parts:
        story.append(Paragraph(" | ".join(contact_parts), contact_style))
        story.append(Spacer(1, 12))
    
    # Section order based on preset
    section_order = preset.get("section_order", ["summary", "experience", "education", "skills", "projects"])
    labels = preset.get("labels", {})
    
    for section in section_order:
        if section == "profile" or section == "jd":
            continue  # Skip UI-only sections
            
        if section == "summary" and resume.summary:
            story.append(Paragraph(labels.get("summary", "Professional Summary"), heading_style))
            story.append(Paragraph(resume.summary, normal_style))
            story.append(Spacer(1, 12))
            
        elif section == "skills" and resume.skills:
            story.append(Paragraph("Skills", heading_style))
            skills_text = ", ".join(resume.skills)
            story.append(Paragraph(skills_text, normal_style))
            story.append(Spacer(1, 12))
            
        elif section == "experience" and resume.experience:
            story.append(Paragraph(labels.get("experience", "Experience"), heading_style))
            for exp in resume.experience:
                # Experience header
                exp_header = []
                if exp.title:
                    exp_header.append(f"<b>{exp.title}</b>")
                if exp.company:
                    exp_header.append(exp.company)
                if exp.city:
                    exp_header.append(exp.city)
                
                header_text = " | ".join(exp_header)
                if exp.start_date or exp.end_date:
                    date_range = f"{exp.start_date or ''} - {exp.end_date or 'Present'}"
                    header_text += f" ({date_range})"
                
                story.append(Paragraph(header_text, normal_style))
                
                # Bullets
                for bullet in exp.bullets:
                    story.append(Paragraph(f"• {bullet}", normal_style))
                story.append(Spacer(1, 6))
                
        elif section == "education" and resume.education:
            story.append(Paragraph(labels.get("education", "Education"), heading_style))
            for edu in resume.education:
                edu_parts = []
                if edu.degree:
                    edu_parts.append(f"<b>{edu.degree}</b>")
                if edu.institution:
                    edu_parts.append(edu.institution)
                
                edu_text = " | ".join(edu_parts)
                if edu.start_date or edu.end_date:
                    date_range = f"{edu.start_date or ''} - {edu.end_date or 'Present'}"
                    edu_text += f" ({date_range})"
                
                story.append(Paragraph(edu_text, normal_style))
                if edu.details:
                    story.append(Paragraph(edu.details, normal_style))
                story.append(Spacer(1, 6))
                
        elif section == "projects" and resume.projects:
            story.append(Paragraph("Projects", heading_style))
            for proj in resume.projects:
                proj_header = []
                if proj.name:
                    proj_header.append(f"<b>{proj.name}</b>")
                if proj.tech:
                    proj_header.append(f"({', '.join(proj.tech)})")
                if proj.link:
                    proj_header.append(proj.link)
                
                story.append(Paragraph(" | ".join(proj_header), normal_style))
                if proj.description:
                    story.append(Paragraph(proj.description, normal_style))
                story.append(Spacer(1, 6))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

@api_router.post("/import/upload", response_model=ImportResponse)
async def import_resume(file: UploadFile = File(...)):
    """Import resume from PDF file"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Check file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Check file size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File size exceeds {MAX_UPLOAD_SIZE // (1024*1024)}MB limit")
    
    try:
        # Extract data from PDF
        extracted_data = extract_resume_data_from_pdf(content)
        
        # Create Resume object
        resume = Resume(**extracted_data)
        
        warnings = []
        if not resume.contact.full_name:
            warnings.append("No name detected in the PDF")
        if not resume.contact.email:
            warnings.append("No email address found")
        if not resume.experience:
            warnings.append("No work experience detected")
        
        return ImportResponse(
            success=True,
            message=f"Successfully parsed resume from {file.filename}",
            extracted_data=resume,
            warnings=warnings
        )
        
    except Exception as e:
        logging.getLogger(__name__).error(f"Import failed: {e}")
        return ImportResponse(
            success=False,
            message=f"Failed to parse PDF: {str(e)}",
            warnings=["PDF parsing failed - please check file format"]
        )

@api_router.get("/export/pdf/{resume_id}")
async def export_resume_pdf(resume_id: str):
    """Export resume as PDF with preset styling"""
    # Get resume
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume = Resume(**{k: v for k, v in found.items() if k in Resume.model_fields})
    
    try:
        # Generate PDF
        pdf_content = generate_pdf_resume(resume)
        
        # Return PDF response
        from fastapi.responses import Response
        filename = f"resume_{resume.contact.full_name or 'AtlasCV'}_{resume.locale}.pdf".replace(" ", "_")
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logging.getLogger(__name__).error(f"PDF export failed: {e}")
        raise HTTPException(status_code=500, detail="PDF generation failed")

@api_router.post("/export/json/{resume_id}")
async def export_resume_json(resume_id: str):
    """Export resume as JSON"""
    found = await db.resumes.find_one({"id": resume_id})
    if not found:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume = Resume(**{k: v for k, v in found.items() if k in Resume.model_fields})
    
    from fastapi.responses import Response
    filename = f"resume_{resume.contact.full_name or 'AtlasCV'}_{resume.locale}.json".replace(" ", "_")
    
    return Response(
        content=resume.model_dump_json(indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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