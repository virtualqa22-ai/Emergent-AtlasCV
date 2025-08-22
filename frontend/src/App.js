import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { BadgeCheck, Save, UploadCloud, LayoutTemplate, FileText, Search, ShieldCheck, Settings, Lock } from "lucide-react";
import { Progress } from "./components/ui/progress";

// Phase 7 Privacy Components
import CookieConsentBanner from "./components/privacy/CookieConsentBanner";
import PrivacySettings from "./components/privacy/PrivacySettings";
import { useLocalOnlyMode } from "./hooks/useLocalStorage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LOGO_URL = "https://customer-assets.emergentagent.com/job_cv-builder-26/artifacts/ionqa5az_AtlasCV_Logo_Transparent.png";

const defaultResumeIN = {
  locale: "IN",
  contact: { full_name: "", email: "", phone: "", city: "", state: "", country: "India", linkedin: "", website: "" },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

function useResumeDraft() {
  const [resumeId, setResumeId] = useState(() => localStorage.getItem("atlascv_resume_id") || "");
  const { isLocalMode, saveLocalResume, getLocalResume } = useLocalOnlyMode();
  
  const remember = (id) => { 
    if (!isLocalMode) {
      setResumeId(id); 
      localStorage.setItem("atlascv_resume_id", id); 
    }
  };
  
  const clear = () => { 
    setResumeId(""); 
    localStorage.removeItem("atlascv_resume_id"); 
  };
  
  return { resumeId, remember, clear, isLocalMode, saveLocalResume, getLocalResume };
}

function Home() {
  const { resumeId, remember, isLocalMode, saveLocalResume, getLocalResume } = useResumeDraft();
  const [locales, setLocales] = useState([]);
  const [presets, setPresets] = useState({});
  const [form, setForm] = useState(defaultResumeIN);
  const [saving, setSaving] = useState(false);
  const [ats, setAts] = useState({ score: 0, hints: [] });
  const [jdText, setJdText] = useState("");
  const [jdKeywords, setJdKeywords] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [validation, setValidation] = useState({ issues: [], locale: "IN" });
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(null);

  const handleChange = (path, value) => {
    setForm((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const segs = path.split(".");
      let cur = copy;
      for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
      cur[segs[segs.length - 1]] = value;
      return copy;
    });
  };

  const addArrayItem = (key, item) => setForm((p) => ({ ...p, [key]: [...p[key], item] }));
  const removeArrayItem = (key, idx) => setForm((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  useEffect(() => {
    const boot = async () => {
      try {
        // Load local data first if in local-only mode
        if (isLocalMode) {
          const localData = getLocalResume();
          if (localData) {
            setForm(localData);
          }
        }
        
        const [loc, pre] = await Promise.all([
          axios.get(`${API}/locales`),
          axios.get(`${API}/presets`),
        ]);
        setLocales(loc.data.locales || []);
        const map = {};
        (pre.data.presets || []).forEach((p) => { map[p.code] = p; });
        setPresets(map);
      } catch(e) { 
        console.error(e);
        // If API fails and we're in local mode, still show UI
        if (isLocalMode) {
          console.log("Working in local-only mode due to API failure");
        }
      }
    };
    boot();
  }, [isLocalMode, getLocalResume]);

  const saveResume = async () => {
    setSaving(true);
    try {
      if (isLocalMode) {
        // Save locally with encryption
        const savedData = saveLocalResume(form);
        if (savedData) {
          // Calculate local heuristic score
          const localScore = calculateLocalScore(form);
          setAts(localScore);
        }
      } else {
        // Save to server
        let idToScore = resumeId;
        if (!resumeId) {
          const { data } = await axios.post(`${API}/resumes`, form);
          idToScore = data.id;
          remember(idToScore);
        } else {
          await axios.put(`${API}/resumes/${resumeId}`, form);
          idToScore = resumeId;
        }
        if (idToScore) {
          const { data: score } = await axios.post(`${API}/resumes/${idToScore}/score`);
          setAts(score);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Local scoring function for privacy mode
  const calculateLocalScore = (resumeData) => {
    let score = 100;
    const hints = [];
    
    // Basic validation
    if (!resumeData.contact?.full_name?.trim()) {
      hints.push("Add your full name in Contact.");
      score -= 20;
    }
    if (!resumeData.contact?.email?.trim()) {
      hints.push("Add an email address.");
      score -= 20;
    }
    if (!resumeData.experience?.length) {
      hints.push("Add at least one experience entry.");
      score -= 25;
    }
    if (!resumeData.skills?.length || resumeData.skills.length < 5) {
      hints.push("Add more relevant skills (aim for 8–12).");
      score -= 10;
    }
    
    return { score: Math.max(0, score), hints };
  };

  const validateLocale = async () => {
    try {
      const { data } = await axios.post(`${API}/validate`, { resume: form });
      setValidation(data);
    } catch (e) { console.error(e); }
  };

  const parseJD = async () => {
    if (!jdText.trim()) return;
    setParsing(true);
    setCoverage(null);
    try {
      const { data } = await axios.post(`${API}/jd/parse`, { text: jdText });
      setJdKeywords(data.keywords || []);
    } catch (e) { console.error(e); }
    finally { setParsing(false); }
  };

  const checkCoverage = async () => {
    if (!jdKeywords.length) return;
    try {
      const { data } = await axios.post(`${API}/jd/coverage`, { resume: form, jd_keywords: jdKeywords });
      setCoverage(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (jdKeywords.length) { checkCoverage(); } }, [jdKeywords, form]);

  const preset = presets[form.locale] || { date_format: "YYYY-MM", section_order: ["profile","jd","summary","skills","experience","projects","education"], labels: {} };

  const scoreColor = useMemo(() => ats.score >= 80 ? "text-emerald-600" : ats.score >= 60 ? "text-amber-600" : "text-rose-600", [ats.score]);

  const SectionRow = ({ label, sec }) => {
    if (!sec) return null;
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span>{label}</span>
          <span className="font-medium">{sec.coverage_percent}%</span>
        </div>
        <Progress value={sec.coverage_percent} className="h-2 mt-1" />
        {sec.missing?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {sec.missing.slice(0, 10).map((k, i) => (
              <span key={i} className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 text-xs">{k}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render section components mapped by key
  const Sections = {
    profile: (
      <Card className="section card-hover" key="profile">
        <CardHeader>
          <CardTitle className="h-heading">Profile & Locale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Locale</Label>
              <Select value={form.locale} onValueChange={(v) => handleChange("locale", v)}>
                <SelectTrigger className="mt-1" aria-label="Select locale">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" value={form.contact.full_name} onChange={(e) => handleChange("contact.full_name", e.target.value)} placeholder="e.g., Aditya Sharma" />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={form.contact.email} onChange={(e) => handleChange("contact.email", e.target.value)} placeholder="name@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Phone (+country)</Label>
              <Input className="mt-1" value={form.contact.phone} onChange={(e) => handleChange("contact.phone", e.target.value)} placeholder="+91 98xxxxxx" />
            </div>
            <div>
              <Label>City</Label>
              <Input className="mt-1" value={form.contact.city} onChange={(e) => handleChange("contact.city", e.target.value)} placeholder="Bengaluru" />
            </div>
            <div>
              <Label>State</Label>
              <Input className="mt-1" value={form.contact.state} onChange={(e) => handleChange("contact.state", e.target.value)} placeholder="Karnataka" />
            </div>
            <div>
              <Label>LinkedIn</Label>
              <Input className="mt-1" value={form.contact.linkedin} onChange={(e) => handleChange("contact.linkedin", e.target.value)} placeholder="https://linkedin.com/in/.." />
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    jd: (
      <Card className="section card-hover" key="jd">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 h-heading"><Search className="h-5 w-5" /> JD Match (Heuristic)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Paste Job Description</Label>
          <Textarea rows={5} placeholder="Paste JD here to extract keywords and see coverage." value={jdText} onChange={(e) => setJdText(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={parseJD} disabled={parsing}>{parsing ? "Parsing..." : "Extract keywords"}</Button>
            <Button variant="ghost" onClick={() => { setJdText(""); setJdKeywords([]); setCoverage(null); }}>Clear</Button>
          </div>
          {jdKeywords.length > 0 && (
            <div className="text-sm">
              <div className="mb-1">Keywords ({jdKeywords.length}):</div>
              <div className="flex flex-wrap gap-2">
                {jdKeywords.map((k, i) => (
                  <span key={i} className="rounded-full border px-2 py-1 text-xs">{k}</span>
                ))}
              </div>
            </div>
          )}
          {coverage && (
            <div className="text-sm mt-2">
              <div className="mb-2">
                Coverage overall: <span className="font-semibold">{coverage.coverage_percent}%</span>
                {coverage.missing.length > 0 && (
                  <div className="mt-2">
                    <div className="mb-1">Missing overall:</div>
                    <div className="flex flex-wrap gap-2">
                      {coverage.missing.map((k, i) => (<span key={i} className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 text-xs">{k}</span>))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="font-medium mb-1">Per-section coverage</div>
                <SectionRow label="Skills" sec={coverage.per_section?.skills} />
                <SectionRow label="Experience" sec={coverage.per_section?.experience} />
                <SectionRow label="Projects" sec={coverage.per_section?.projects} />
                <SectionRow label="Summary" sec={coverage.per_section?.summary} />
                <SectionRow label="Education" sec={coverage.per_section?.education} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    summary: (
      <Card className="section card-hover" key="summary">
        <CardHeader>
          <CardTitle className="h-heading">{presets[form.locale]?.labels?.summary || 'Professional Summary'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea className="mt-1" rows={5} value={form.summary} onChange={(e) => handleChange("summary", e.target.value)} placeholder="2–3 lines capturing scope, years, domains, and top skills relevant to the role." />
        </CardContent>
      </Card>
    ),
    skills: (
      <Card className="section card-hover" key="skills">
        <CardHeader>
          <CardTitle className="h-heading">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Comma-separated skills (e.g., React, Node, AWS)" value={form.skills.join(", ")} onChange={(e) => handleChange("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
          <p className="text-xs label-sub mt-2">Aim for 8–12 concise, role-aligned skills.</p>
        </CardContent>
      </Card>
    ),
    experience: (
      <Card className="section card-hover" key="experience">
        <CardHeader>
          <CardTitle className="h-heading">{presets[form.locale]?.labels?.experience || 'Experience'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.experience.map((exp, idx) => (
            <div key={exp.id} className="rounded-lg border p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input placeholder="Company" value={exp.company} onChange={(e) => {
                  const copy = [...form.experience]; copy[idx].company = e.target.value; setForm({ ...form, experience: copy });
                }} />
                <Input placeholder="Title" value={exp.title} onChange={(e) => { const copy = [...form.experience]; copy[idx].title = e.target.value; setForm({ ...form, experience: copy }); }} />
                <Input placeholder="City" value={exp.city} onChange={(e) => { const copy = [...form.experience]; copy[idx].city = e.target.value; setForm({ ...form, experience: copy }); }} />
                <Input placeholder={`${presets[form.locale]?.date_format} to ${presets[form.locale]?.date_format}/Present`} value={`${exp.start_date}${exp.end_date ? ` — ${exp.end_date}` : ""}`} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input placeholder={`Start ${presets[form.locale]?.date_format}`} value={exp.start_date} onChange={(e) => { const copy = [...form.experience]; copy[idx].start_date = e.target.value; setForm({ ...form, experience: copy }); }} />
                <Input placeholder={`End ${presets[form.locale]?.date_format} or Present`} value={exp.end_date || ""} onChange={(e) => { const copy = [...form.experience]; copy[idx].end_date = e.target.value; setForm({ ...form, experience: copy }); }} />
              </div>
              <div className="mt-3">
                <Label>Bullets</Label>
                {exp.bullets.map((b, bi) => (
                  <Input key={bi} className="mt-2" value={b} onChange={(e) => {
                    const copy = [...form.experience]; copy[idx].bullets[bi] = e.target.value; setForm({ ...form, experience: copy });
                  }} placeholder="Impact-oriented bullet" />
                ))}
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={() => { const copy = [...form.experience]; copy[idx].bullets.push(""); setForm({ ...form, experience: copy }); }}>Add bullet</Button>
                  <Button variant="ghost" onClick={() => removeArrayItem("experience", idx)}>Remove role</Button>
                </div>
              </div>
            </div>
          ))}
          <Button onClick={() => addArrayItem("experience", { id: crypto.randomUUID(), company: "", title: "", city: "", start_date: "", end_date: "", bullets: [] })}>Add experience</Button>
        </CardContent>
      </Card>
    ),
    education: (
      <Card className="section card-hover" key="education">
        <CardHeader>
          <CardTitle className="h-heading">{presets[form.locale]?.labels?.education || 'Education'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.education.map((ed, idx) => (
            <div key={ed.id} className="rounded-lg border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Institution" value={ed.institution} onChange={(e) => { const copy = [...form.education]; copy[idx].institution = e.target.value; setForm({ ...form, education: copy }); }} />
              <Input placeholder="Degree" value={ed.degree} onChange={(e) => { const copy = [...form.education]; copy[idx].degree = e.target.value; setForm({ ...form, education: copy }); }} />
              <Input placeholder={`Start ${presets[form.locale]?.date_format}`} value={ed.start_date} onChange={(e) => { const copy = [...form.education]; copy[idx].start_date = e.target.value; setForm({ ...form, education: copy }); }} />
              <Input placeholder={`End ${presets[form.locale]?.date_format}/Present`} value={ed.end_date || ""} onChange={(e) => { const copy = [...form.education]; copy[idx].end_date = e.target.value; setForm({ ...form, education: copy }); }} />
              <div className="md:col-span-4">
                <Textarea rows={3} placeholder="Details, honors, GPA (if strong), relevant coursework" value={ed.details} onChange={(e) => { const copy = [...form.education]; copy[idx].details = e.target.value; setForm({ ...form, education: copy }); }} />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <Button variant="ghost" onClick={() => removeArrayItem("education", idx)}>Remove</Button>
              </div>
            </div>
          ))}
          <Button onClick={() => addArrayItem("education", { id: crypto.randomUUID(), institution: "", degree: "", start_date: "", end_date: "", details: "" })}>Add education</Button>
        </CardContent>
      </Card>
    ),
    projects: (
      <Card className="section card-hover" key="projects">
        <CardHeader>
          <CardTitle className="h-heading">Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.projects.map((pr, idx) => (
            <div key={pr.id} className="rounded-lg border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Name" value={pr.name} onChange={(e) => { const copy = [...form.projects]; copy[idx].name = e.target.value; setForm({ ...form, projects: copy }); }} />
              <Input placeholder="Tech (comma separated)" value={pr.tech.join(", ")} onChange={(e) => { const copy = [...form.projects]; copy[idx].tech = e.target.value.split(",").map(s => s.trim()).filter(Boolean); setForm({ ...form, projects: copy }); }} />
              <Input placeholder="Link" value={pr.link} onChange={(e) => { const copy = [...form.projects]; copy[idx].link = e.target.value; setForm({ ...form, projects: copy }); }} />
              <div className="md:col-span-4">
                <Textarea rows={3} placeholder="One or two bullets of what it does and the impact/results" value={pr.description} onChange={(e) => { const copy = [...form.projects]; copy[idx].description = e.target.value; setForm({ ...form, projects: copy }); }} />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <Button variant="ghost" onClick={() => removeArrayItem("projects", idx)}>Remove</Button>
              </div>
            </div>
          ))}
          <Button onClick={() => addArrayItem("projects", { id: crypto.randomUUID(), name: "", description: "", tech: [], link: "" })}>Add project</Button>
        </CardContent>
      </Card>
    ),
  };

  const leftOrder = preset.section_order || ["profile","jd","summary","skills","experience","projects","education"];

  return (
    <div className="min-h-screen atlas-gradient">
      <header className="sticky top-0 z-30 border-b header-blur bg-white/70">
        <div className="container-xl flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="AtlasCV" className="brand-logo" />
            <span className="font-semibold h-heading" style={{color:"#1D4ED8"}}>AtlasCV</span>
            <span className="text-sm" style={{color:"#16A34A"}}>ATS-Optimized Resume Builder</span>
          </div>
          <div className="flex items-center gap-2">
            {isLocalMode && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                <Lock className="h-3 w-3" />
                Local Mode
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowPrivacySettings(!showPrivacySettings)}
              className="text-gray-600"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button className="btn-cta" onClick={validateLocale} variant="outline">
              <ShieldCheck className="h-4 w-4" /> Validate preset
            </Button>
            <Button className="btn-cta" onClick={saveResume} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : (isLocalMode ? "Save Local" : "Save Draft")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container-xl grid grid-cols-12 gap-6 py-6">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {leftOrder.map((key) => Sections[key]).filter(Boolean)}
        </div>

        {/* Right column: ATS & Preset info */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Card className="section card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 h-heading"><BadgeCheck className="h-5 w-5 text-slate-700" /> Live ATS Heuristic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                Score: <span className={scoreColor}>{ats.score}</span>/100
              </div>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
                {ats.hints.map((h, i) => (<li key={i}>{h}</li>))}
                {ats.hints.length === 0 ? <li>Looks solid. Keep quantifying impact.</li> : null}
              </ul>
              {validation?.issues?.length > 0 && (
                <div className="mt-4">
                  <div className="font-medium h-heading">Locale Validation</div>
                  <ul className="list-disc pl-5 text-sm text-slate-600 mt-1">
                    {validation.issues.map((x, i) => (<li key={i}>{x}</li>))}
                  </ul>
                </div>
              )}
              <div className="mt-4 text-xs label-sub">Heuristic score + preset validation. AI tips coming next.</div>
            </CardContent>
          </Card>

          <Card className="section card-hover">
            <CardHeader>
              <CardTitle className="h-heading">Preset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Current: <span className="font-medium">{presets[form.locale]?.label || form.locale}</span></div>
              <div className="text-xs label-sub mt-2">Date format: {preset.date_format}</div>
              <div className="text-xs label-sub mt-2">Section order: {leftOrder.join(" → ")}</div>
              {preset.rules?.length ? (
                <div className="mt-2 text-sm">
                  <div className="font-medium mb-1">Key rules</div>
                  <ul className="list-disc pl-5">
                    {preset.rules.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="section card-hover">
            <CardHeader>
              <CardTitle className="h-heading">Import/Export (coming soon)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline"><UploadCloud className="h-4 w-4" />Import</Button>
              <Button variant="outline"><FileText className="h-4 w-4" />Export</Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t bg-white/70">
        <div className="container-xl py-6 text-sm text-slate-600">© {new Date().getFullYear()} AtlasCV. ATS-safe builder.</div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;