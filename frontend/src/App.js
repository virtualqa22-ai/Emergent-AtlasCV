import { useEffect, useMemo, useState, useCallback } from "react";
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
import { BadgeCheck, Save, UploadCloud, LayoutTemplate, FileText, Search, ShieldCheck, Settings, Lock, Camera, Calendar, Award, Users, Globe, Heart } from "lucide-react";
import { Progress } from "./components/ui/progress";

// Phase 7 Privacy Components
import CookieConsentBanner from "./components/privacy/CookieConsentBanner";
import PrivacySettings from "./components/privacy/PrivacySettings";
import { useLocalOnlyMode } from "./hooks/useLocalStorage";

// Phase 8 Live Preview Components
import ResumePreview from "./components/resume/ResumePreview";
import TemplateSelector from "./components/resume/TemplateSelector";
import { useDebounce } from "./hooks/useDebounce";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LOGO_URL = "https://customer-assets.emergentagent.com/job_cv-builder-26/artifacts/ionqa5az_AtlasCV_Logo_Transparent.png";

const defaultResumeIN = {
  locale: "IN",
  contact: { 
    full_name: "", 
    email: "", 
    phone: "", 
    city: "", 
    state: "", 
    country: "India", 
    linkedin: "", 
    website: "",
    // Phase 9: Optional fields
    photo_url: "",
    date_of_birth: ""
  },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  // Phase 9: New optional sections
  certifications: [],
  references: [],
  personal_details: {
    nationality: "",
    visa_status: "",
    languages: [],
    hobbies: [],
    volunteer_work: "",
    awards: []
  }
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
  
  // Phase 8: Live Preview State
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState('split'); // 'split', 'preview', 'edit'
  
  // Phase 9: Optional Fields State
  const [optionalFieldsConfig, setOptionalFieldsConfig] = useState({});
  const [visibleOptionalFields, setVisibleOptionalFields] = useState({
    photo: false,
    date_of_birth: false,
    certifications: false,
    references: false,
    personal_details: false,
    hobbies: false
  });
  
  // Debounce form updates for smooth preview
  const debouncedForm = useDebounce(form, 300);

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

  // Phase 9: Load optional field configuration for current locale
  const loadOptionalFieldsConfig = async (locale) => {
    try {
      const response = await axios.get(`${API}/presets/${locale}/optional-fields`);
      const config = response.data;
      setOptionalFieldsConfig(config);
      
      // Update visible fields based on locale defaults
      const newVisibleFields = {};
      Object.entries(config.optional_fields || {}).forEach(([field, isAllowed]) => {
        // Show field if it's allowed and commonly used in this locale
        newVisibleFields[field] = isAllowed && (
          (field === 'photo' && ['JP-R', 'IN', 'EU', 'SG', 'AE'].includes(locale)) ||
          (field === 'certifications' && isAllowed) ||
          (field === 'personal_details' && ['IN', 'SG', 'AE', 'CA', 'EU', 'AU'].includes(locale)) ||
          (field === 'references' && ['AU', 'CA', 'US', 'EU'].includes(locale)) ||
          (field === 'date_of_birth' && ['JP-R', 'IN', 'SG', 'AE', 'EU'].includes(locale))
        );
      });
      
      setVisibleOptionalFields(newVisibleFields);
    } catch (error) {
      console.error('Failed to load optional fields config:', error);
    }
  };

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
        
        // Load initial optional fields config
        await loadOptionalFieldsConfig(form.locale);
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
  
  // Phase 9: Update optional fields when locale changes
  useEffect(() => {
    if (form.locale) {
      loadOptionalFieldsConfig(form.locale);
    }
  }, [form.locale]);

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

  const handleConsentChange = useCallback((consentData) => {
    setCookieConsent(prevConsent => {
      // Only update if consent actually changed
      if (!prevConsent || JSON.stringify(prevConsent) !== JSON.stringify(consentData)) {
        // Handle analytics/marketing consent here only on actual change
        if (consentData.preferences?.analytics && !prevConsent?.preferences?.analytics) {
          console.log("Analytics enabled");
        }
        return consentData;
      }
      return prevConsent;
    });
  }, []);

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
          
          {/* Phase 9: Optional Contact Fields */}
          {(visibleOptionalFields.photo || visibleOptionalFields.date_of_birth) && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Optional Fields for {optionalFieldsConfig.locale || form.locale}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleOptionalFields.photo && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Photo URL
                      {optionalFieldsConfig.optional_fields?.photo === false && (
                        <span className="text-xs text-red-600">(Not recommended for this locale)</span>
                      )}
                    </Label>
                    <Input 
                      className="mt-1" 
                      value={form.contact.photo_url || ""} 
                      onChange={(e) => handleChange("contact.photo_url", e.target.value)} 
                      placeholder="https://example.com/photo.jpg" 
                    />
                  </div>
                )}
                {visibleOptionalFields.date_of_birth && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date of Birth
                      {optionalFieldsConfig.optional_fields?.date_of_birth === false && (
                        <span className="text-xs text-red-600">(Not recommended for this locale)</span>
                      )}
                    </Label>
                    <Input 
                      className="mt-1" 
                      type="date"
                      value={form.contact.date_of_birth || ""} 
                      onChange={(e) => handleChange("contact.date_of_birth", e.target.value)} 
                    />
                  </div>
                )}
              </div>
            </div>
          )}
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
    
    // Phase 9: New Optional Sections
    certifications: visibleOptionalFields.certifications ? (
      <Card className="section card-hover" key="certifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 h-heading">
            <Award className="h-5 w-5" />
            {optionalFieldsConfig.labels?.certifications || 'Certifications'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.certifications || []).map((cert, idx) => (
            <div key={cert.id} className="rounded-lg border p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input 
                  placeholder="Certification Name" 
                  value={cert.name} 
                  onChange={(e) => { 
                    const copy = [...(form.certifications || [])]; 
                    copy[idx].name = e.target.value; 
                    setForm({ ...form, certifications: copy }); 
                  }} 
                />
                <Input 
                  placeholder="Issuing Organization" 
                  value={cert.issuer} 
                  onChange={(e) => { 
                    const copy = [...(form.certifications || [])]; 
                    copy[idx].issuer = e.target.value; 
                    setForm({ ...form, certifications: copy }); 
                  }} 
                />
                <Input 
                  placeholder="Issue Date (YYYY-MM)" 
                  value={cert.issue_date} 
                  onChange={(e) => { 
                    const copy = [...(form.certifications || [])]; 
                    copy[idx].issue_date = e.target.value; 
                    setForm({ ...form, certifications: copy }); 
                  }} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Input 
                  placeholder="Credential ID (optional)" 
                  value={cert.credential_id} 
                  onChange={(e) => { 
                    const copy = [...(form.certifications || [])]; 
                    copy[idx].credential_id = e.target.value; 
                    setForm({ ...form, certifications: copy }); 
                  }} 
                />
                <Input 
                  placeholder="Credential URL (optional)" 
                  value={cert.credential_url} 
                  onChange={(e) => { 
                    const copy = [...(form.certifications || [])]; 
                    copy[idx].credential_url = e.target.value; 
                    setForm({ ...form, certifications: copy }); 
                  }} 
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" onClick={() => removeArrayItem("certifications", idx)}>Remove</Button>
              </div>
            </div>
          ))}
          <Button onClick={() => addArrayItem("certifications", { 
            id: crypto.randomUUID(), 
            name: "", 
            issuer: "", 
            issue_date: "", 
            expiry_date: "", 
            credential_id: "", 
            credential_url: "" 
          })}>
            Add Certification
          </Button>
        </CardContent>
      </Card>
    ) : null,

    references: visibleOptionalFields.references ? (
      <Card className="section card-hover" key="references">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 h-heading">
            <Users className="h-5 w-5" />
            {optionalFieldsConfig.labels?.references || 'References'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.references || []).map((ref, idx) => (
            <div key={ref.id} className="rounded-lg border p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input 
                  placeholder="Reference Name" 
                  value={ref.name} 
                  onChange={(e) => { 
                    const copy = [...(form.references || [])]; 
                    copy[idx].name = e.target.value; 
                    setForm({ ...form, references: copy }); 
                  }} 
                />
                <Input 
                  placeholder="Title/Position" 
                  value={ref.title} 
                  onChange={(e) => { 
                    const copy = [...(form.references || [])]; 
                    copy[idx].title = e.target.value; 
                    setForm({ ...form, references: copy }); 
                  }} 
                />
                <Input 
                  placeholder="Company" 
                  value={ref.company} 
                  onChange={(e) => { 
                    const copy = [...(form.references || [])]; 
                    copy[idx].company = e.target.value; 
                    setForm({ ...form, references: copy }); 
                  }} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <Input 
                  placeholder="Email" 
                  type="email"
                  value={ref.email} 
                  onChange={(e) => { 
                    const copy = [...(form.references || [])]; 
                    copy[idx].email = e.target.value; 
                    setForm({ ...form, references: copy }); 
                  }} 
                />
                <Input 
                  placeholder="Phone" 
                  value={ref.phone} 
                  onChange={(e) => { 
                    const copy = [...(form.references || [])]; 
                    copy[idx].phone = e.target.value; 
                    setForm({ ...form, references: copy }); 
                  }} 
                />
                <Select 
                  value={ref.relationship} 
                  onValueChange={(v) => { 
                    const copy = [...(form.references || [])]; 
                    copy[idx].relationship = v; 
                    setForm({ ...form, references: copy }); 
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Colleague">Colleague</SelectItem>
                    <SelectItem value="Professor">Professor</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" onClick={() => removeArrayItem("references", idx)}>Remove</Button>
              </div>
            </div>
          ))}
          <Button onClick={() => addArrayItem("references", { 
            id: crypto.randomUUID(), 
            name: "", 
            title: "", 
            company: "", 
            email: "", 
            phone: "", 
            relationship: "" 
          })}>
            Add Reference
          </Button>
        </CardContent>
      </Card>
    ) : null,

    personal_details: visibleOptionalFields.personal_details ? (
      <Card className="section card-hover" key="personal_details">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 h-heading">
            <Globe className="h-5 w-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nationality</Label>
              <Input 
                className="mt-1" 
                value={form.personal_details?.nationality || ""} 
                onChange={(e) => handleChange("personal_details.nationality", e.target.value)} 
                placeholder="e.g., Indian, American" 
              />
            </div>
            <div>
              <Label>Visa Status</Label>
              <Input 
                className="mt-1" 
                value={form.personal_details?.visa_status || ""} 
                onChange={(e) => handleChange("personal_details.visa_status", e.target.value)} 
                placeholder="e.g., Work Permit, Citizen" 
              />
            </div>
          </div>
          
          <div>
            <Label>Languages</Label>
            <Input 
              className="mt-1" 
              value={(form.personal_details?.languages || []).join(", ")} 
              onChange={(e) => handleChange("personal_details.languages", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
              placeholder="English, Hindi, Spanish" 
            />
          </div>
          
          {visibleOptionalFields.hobbies && (
            <div>
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Hobbies & Interests
              </Label>
              <Input 
                className="mt-1" 
                value={(form.personal_details?.hobbies || []).join(", ")} 
                onChange={(e) => handleChange("personal_details.hobbies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
                placeholder="Reading, Photography, Traveling" 
              />
            </div>
          )}
          
          <div>
            <Label>Volunteer Work</Label>
            <Textarea 
              className="mt-1" 
              rows={3}
              value={form.personal_details?.volunteer_work || ""} 
              onChange={(e) => handleChange("personal_details.volunteer_work", e.target.value)} 
              placeholder="Describe any volunteer activities or community service" 
            />
          </div>
          
          <div>
            <Label>Awards & Achievements</Label>
            <Input 
              className="mt-1" 
              value={(form.personal_details?.awards || []).join(", ")} 
              onChange={(e) => handleChange("personal_details.awards", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
              placeholder="Best Employee 2024, Dean's List" 
            />
          </div>
        </CardContent>
      </Card>
    ) : null,
  };

  // Phase 9: Use locale-specific section order with optional fields
  const leftOrder = (optionalFieldsConfig.section_order || preset.section_order || ["profile","jd","summary","skills","experience","projects","education"])
    .filter(key => {
      // Always show core sections
      if (['profile', 'jd', 'summary', 'skills', 'experience', 'education', 'projects'].includes(key)) {
        return true;
      }
      // Show optional sections only if they're visible
      return visibleOptionalFields[key];
    });

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
            
            {/* Phase 8: Preview Controls */}
            <div className="hidden lg:flex items-center gap-1 border rounded">
              <Button
                variant={previewMode === 'edit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('edit')}
                className="text-xs"
              >
                <FileText className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant={previewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('split')}
                className="text-xs"
              >
                <LayoutTemplate className="h-4 w-4" />
                Split
              </Button>
              <Button
                variant={previewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('preview')}
                className="text-xs"
              >
                <Search className="h-4 w-4" />
                Preview
              </Button>
            </div>
            
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

      <main className="container-xl py-6">
        {/* Mobile Preview Mode Selector */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center gap-1 border rounded p-1">
            <Button
              variant={previewMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('edit')}
              className="flex-1 text-xs"
            >
              <FileText className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant={previewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('preview')}
              className="flex-1 text-xs"
            >
              <Search className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 ${
          previewMode === 'split' 
            ? 'lg:grid-cols-2' 
            : previewMode === 'edit'
              ? 'grid-cols-1'
              : 'grid-cols-1'
        }`}>
          
          {/* Editor Column */}
          {(previewMode === 'edit' || previewMode === 'split') && (
            <div className={`space-y-6 ${
              previewMode === 'split' ? 'lg:col-span-1' : 'col-span-1'
            }`}>
              {/* Template Selector */}
              <Card className="section card-hover">
                <CardContent className="p-4">
                  <TemplateSelector 
                    selectedTemplate={selectedTemplate}
                    onTemplateChange={setSelectedTemplate}
                  />
                </CardContent>
              </Card>

              {/* Form Sections */}
              {leftOrder.map((key) => Sections[key]).filter(Boolean)}

              {/* ATS Score - Only show in edit-only mode or mobile */}
              {(previewMode === 'edit' || previewMode === 'preview') && (
                <Card className="section card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 h-heading">
                      <BadgeCheck className="h-5 w-5 text-slate-700" /> Live ATS Heuristic
                    </CardTitle>
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
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Preview Column */}
          {(previewMode === 'preview' || previewMode === 'split') && (
            <div className={`${
              previewMode === 'split' ? 'lg:col-span-1' : 'col-span-1'
            }`}>
              <div className="space-y-6">
                {/* Live Resume Preview */}
                <Card className="section card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between h-heading">
                      <span className="flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5 text-slate-700" />
                        Live Preview
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.print()}
                          className="text-xs"
                        >
                          <UploadCloud className="h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-gray-50 overflow-auto max-h-[800px]">
                      <ResumePreview 
                        resumeData={debouncedForm}
                        template={selectedTemplate}
                        className="transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* ATS Score in Split Mode */}
                {previewMode === 'split' && (
                  <Card className="section card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 h-heading">
                        <BadgeCheck className="h-5 w-5 text-slate-700" /> Live ATS Heuristic
                      </CardTitle>
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
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Privacy Settings Overlay */}
      {showPrivacySettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Privacy Settings</h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowPrivacySettings(false)}
                  className="text-gray-500"
                >
                  ×
                </Button>
              </div>
              <PrivacySettings 
                resumeId={resumeId} 
                userEmail={form.contact?.email}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cookie Consent Banner */}
      <CookieConsentBanner 
        onConsentChange={handleConsentChange}
      />

      <footer className="border-t bg-white/70">
        <div className="container-xl py-6 text-sm text-slate-600">
          © {new Date().getFullYear()} AtlasCV. ATS-safe builder.
          <span className="ml-4">
            <a href="#privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            {" • "}
            <a href="#terms" className="text-blue-600 hover:underline">Terms</a>
            {cookieConsent && (
              <span>
                {" • "}
                <button 
                  onClick={() => setShowPrivacySettings(true)}
                  className="text-blue-600 hover:underline bg-transparent border-0 p-0 text-sm"
                >
                  Privacy Settings
                </button>
              </span>
            )}
          </span>
        </div>
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