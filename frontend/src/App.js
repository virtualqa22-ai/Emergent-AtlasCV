import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { BadgeCheck, Save, UploadCloud, LayoutTemplate, FileText, Search, ShieldCheck, Share2, MessageCircle, Users, Eye, Edit, Check, X, Palette, Zap, Crown, Code, Brush } from "lucide-react";
import { Progress } from "./components/ui/progress";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";

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
  const remember = (id) => { setResumeId(id); localStorage.setItem("atlascv_resume_id", id); };
  const clear = () => { setResumeId(""); localStorage.removeItem("atlascv_resume_id"); };
  return { resumeId, remember, clear };
}

function Home() {
  const { resumeId, remember } = useResumeDraft();
  
  // Existing state
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
  const [lintSummary, setLintSummary] = useState({ loading: false, issues: [], suggestions: [] });
  const [bulletLint, setBulletLint] = useState({}); // key: "idx-bi" -> { loading, issues, suggestions }
  const [rewriting, setRewriting] = useState(""); // key = "idx-bi"
  const [synLoading, setSynLoading] = useState(false);
  const [synonymsData, setSynonymsData] = useState({ synonyms: {}, prioritize: [] });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Phase 6: Template & Collaboration state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  
  // Collaboration state
  const [shareLink, setShareLink] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePermissions, setSharePermissions] = useState("view");
  const [comments, setComments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSection, setCommentSection] = useState("");
  
  // Accessibility refs
  const skipLinkRef = useRef(null);
  const mainContentRef = useRef(null);
  const [focusVisible, setFocusVisible] = useState(false);

  const keyFor = (i, bi) => `${i}-${bi}`;

  // Accessibility: Handle keyboard navigation  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      setFocusVisible(true);
    }
    // Skip link functionality
    if (e.key === 'Enter' && e.target === skipLinkRef.current) {
      e.preventDefault();
      mainContentRef.current?.focus();
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    setFocusVisible(false);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleKeyDown, handleMouseDown]);

  // Phase 6: Template functions
  const loadTemplates = async () => {
    try {
      const { data } = await axios.get(`${API}/templates`);
      setTemplates(data.templates || []);
    } catch (e) { 
      console.error("Failed to load templates:", e); 
    }
  };

  const applyTemplate = async (templateId) => {
    if (!resumeId) {
      alert("Please save your resume first");
      return;
    }
    
    setApplyingTemplate(true);
    try {
      const { data } = await axios.post(`${API}/templates/${templateId}/apply/${resumeId}`);
      setForm(data);
      setSelectedTemplate(templateId);
      setShowTemplateDialog(false);
      alert("Template applied successfully!");
    } catch (e) {
      console.error("Failed to apply template:", e);
      alert("Failed to apply template. Please try again.");
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Phase 6: Collaboration functions
  const createShareLink = async () => {
    if (!resumeId) {
      alert("Please save your resume first");
      return;
    }
    
    try {
      const { data } = await axios.post(`${API}/share`, {
        resume_id: resumeId,
        permissions: sharePermissions,
        expires_in_days: 30
      });
      setShareLink(data);
      navigator.clipboard.writeText(`${window.location.origin}/share/${data.share_token}`);
      alert("Share link created and copied to clipboard!");
    } catch (e) {
      console.error("Failed to create share link:", e);
      alert("Failed to create share link. Please try again.");
    }
  };

  const loadCollaborationData = async () => {
    if (!resumeId) return;
    
    try {
      const [commentsRes, suggestionsRes] = await Promise.all([
        axios.get(`${API}/comments/${resumeId}`),
        axios.get(`${API}/suggestions/${resumeId}`)
      ]);
      setComments(commentsRes.data.comments || []);
      setSuggestions(suggestionsRes.data.suggestions || []);
    } catch (e) {
      console.error("Failed to load collaboration data:", e);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !commentSection) return;
    
    try {
      const { data } = await axios.post(`${API}/comments`, {
        resume_id: resumeId,
        section: commentSection,
        content: newComment,
        author_name: "You"
      });
      setComments(prev => [...prev, data]);
      setNewComment("");
      setCommentSection("");
    } catch (e) {
      console.error("Failed to add comment:", e);
      alert("Failed to add comment. Please try again.");
    }
  };

  const acceptSuggestion = async (suggestionId) => {
    try {
      await axios.post(`${API}/suggestions/${suggestionId}/accept`);
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, status: 'accepted' } : s)
      );
      // Reload resume data
      if (resumeId) {
        const { data } = await axios.get(`${API}/resumes/${resumeId}`);
        setForm(data);
      }
    } catch (e) {
      console.error("Failed to accept suggestion:", e);
      alert("Failed to accept suggestion. Please try again.");
    }
  };

  const rejectSuggestion = async (suggestionId) => {
    try {
      await axios.post(`${API}/suggestions/${suggestionId}/reject`);
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' } : s)
      );
    } catch (e) {
      console.error("Failed to reject suggestion:", e);
      alert("Failed to reject suggestion. Please try again.");
    }
  };

  // Template category icons
  const getTemplateIcon = (category) => {
    switch (category) {
      case 'professional': return <Crown className="h-4 w-4" />;
      case 'modern': return <Zap className="h-4 w-4" />;
      case 'executive': return <Crown className="h-4 w-4" />;
      case 'technical': return <Code className="h-4 w-4" />;
      case 'creative': return <Brush className="h-4 w-4" />;
      default: return <LayoutTemplate className="h-4 w-4" />;
    }
  };

  const resumePlainText = () => {
    try {
      const expText = (form.experience || []).map(e => [e.company, e.title, e.city, (e.bullets||[]).join(" ")].join(" ")).join(" ");
      const projText = (form.projects || []).map(p => [p.name, p.description, (p.tech||[]).join(" ")].join(" ")).join(" ");
      return [form.summary || "", (form.skills||[]).join(" "), expText, projText].join(" ");
    } catch { return form.summary || ""; }
  };

  const rewriteBullet = async (i, bi) => {
    const k = keyFor(i, bi);
    setRewriting(k);
    try {
      const exp = form.experience[i];
      const bullet = (exp?.bullets || [])[bi] || "";
      const jd_context = jdText || (jdKeywords || []).join(", ");
      const payload = { role_title: exp?.title || "", bullets: [bullet], jd_context, tone: "impactful" };
      const { data } = await axios.post(`${API}/ai/rewrite-bullets`, payload);
      const improved = (data?.improved_bullets || [])[0];
      if (improved) {
        const copy = [...form.experience];
        copy[i].bullets[bi] = improved;
        setForm({ ...form, experience: copy });
      }
    } catch (e) { console.error(e); }
    finally { setRewriting(""); }
  };

  const lintSummaryAI = async () => {
    if (!form.summary?.trim()) return;
    setLintSummary((p) => ({ ...p, loading: true, issues: [], suggestions: [] }));
    try {
      const { data } = await axios.post(`${API}/ai/lint`, { text: form.summary, section: "summary" });
      setLintSummary({ loading: false, issues: data?.issues || [], suggestions: data?.suggestions || [] });
    } catch (e) { console.error(e); setLintSummary({ loading: false, issues: [], suggestions: [] }); }
  };

  const lintBulletAI = async (i, bi) => {
    const k = keyFor(i, bi);
    setBulletLint((prev) => ({ ...prev, [k]: { ...(prev[k]||{}), loading: true } }));
    try {
      const exp = form.experience[i];
      const bullet = (exp?.bullets || [])[bi] || "";
      const { data } = await axios.post(`${API}/ai/lint`, { text: bullet, section: "bullet" });
      setBulletLint((prev) => ({ ...prev, [k]: { loading: false, issues: data?.issues || [], suggestions: data?.suggestions || [] } }));
    } catch (e) {
      console.error(e);
      setBulletLint((prev) => ({ ...prev, [k]: { loading: false, issues: [], suggestions: [] } }));
    }
  };

  const suggestSynonyms = async () => {
    if (!jdKeywords.length) return;
    setSynLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/suggest-keywords`, { jd_keywords: jdKeywords, resume_text: resumePlainText() });
      setSynonymsData({ synonyms: data?.synonyms || {}, prioritize: data?.prioritize || [] });
    } catch (e) { console.error(e); }
    finally { setSynLoading(false); }
  };

  const addSkill = (s) => {
    if (!s) return;
    if ((form.skills||[]).includes(s)) return;
    handleChange("skills", [...(form.skills||[]), s]);
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Only PDF files are supported");
      return;
    }

    setImporting(true);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const { data } = await axios.post(`${API}/import/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportResult(data);
      if (data.success && data.extracted_data) {
        setShowImportModal(true);
      }
    } catch (e) {
      console.error(e);
      setImportResult({
        success: false,
        message: e.response?.data?.detail || "Import failed",
        warnings: ["Please check your file format and try again"]
      });
      setShowImportModal(true);
    } finally {
      setImporting(false);
      // Clear file input
      event.target.value = '';
    }
  };

  const applyImportedData = () => {
    if (importResult?.extracted_data) {
      setForm(importResult.extracted_data);
      setShowImportModal(false);
      setImportResult(null);
      // Auto-save the imported resume
      setTimeout(() => saveResume(), 500);
    }
  };

  const exportPDF = async () => {
    if (!resumeId) {
      alert("Please save your resume first");
      return;
    }
    
    try {
      const response = await fetch(`${API}/export/pdf/${resumeId}`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${form.contact.full_name || 'AtlasCV'}_${form.locale}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("PDF export failed. Please try again.");
    }
  };

  const exportJSON = async () => {
    if (!resumeId) {
      alert("Please save your resume first");
      return;
    }
    
    try {
      const response = await fetch(`${API}/export/json/${resumeId}`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${form.contact.full_name || 'AtlasCV'}_${form.locale}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("JSON export failed. Please try again.");
    }
  };


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
        const [loc, pre] = await Promise.all([
          axios.get(`${API}/locales`),
          axios.get(`${API}/presets`),
        ]);
        setLocales(loc.data.locales || []);
        const map = {};
        (pre.data.presets || []).forEach((p) => { map[p.code] = p; });
        setPresets(map);
        
        // Load templates for Phase 6
        await loadTemplates();
      } catch(e) { console.error(e); }
    };
    boot();
  }, []);

  const saveResume = async () => {
    setSaving(true);
    try {
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
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
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
              <div className="mb-1 flex items-center gap-2">
                <span>Keywords ({jdKeywords.length}):</span>
                <Button size="sm" variant="outline" onClick={suggestSynonyms} disabled={synLoading}>{synLoading ? "Loading..." : "Suggest synonyms"}</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jdKeywords.map((k, i) => (
                  <span key={i} className="rounded-full border px-2 py-1 text-xs">{k}</span>
                ))}
              </div>
              {Object.keys(synonymsData.synonyms || {}).length > 0 && (
                <div className="mt-2">
                  <div className="text-xs label-sub mb-1">Synonyms (click to add to skills)</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(synonymsData.synonyms).map(([kw, syns]) => (
                      <div key={kw} className="border rounded-md px-2 py-1">
                        <div className="text-[11px] font-medium">{kw}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {syns.map((s, si) => (
                            <button key={si} className="rounded-full bg-slate-50 hover:bg-slate-100 border px-2 py-0.5 text-[11px]" onClick={() => addSkill(s)}>{s}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {synonymsData.prioritize?.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs label-sub mb-1">Prioritize</div>
                  <div className="flex flex-wrap gap-2">
                    {synonymsData.prioritize.map((s, i) => (
                      <span key={i} className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
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
    templates: (
      <Card className="section card-hover" key="templates">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 h-heading">
            <LayoutTemplate className="h-5 w-5" /> Template Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Choose from our ATS-optimized templates designed for different industries and roles.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.slice(0, 3).map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm ${
                    selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${template.name} template`}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedTemplate(template.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getTemplateIcon(template.category)}
                    <span className="font-medium text-sm">{template.name}</span>
                    {template.ats_optimized && (
                      <Badge variant="secondary" className="text-xs">ATS</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{template.description}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Browse All Templates</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Choose Template</DialogTitle>
                    <DialogDescription>
                      Select a professional, ATS-optimized template for your resume
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-96">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-blue-300 hover:shadow-md ${
                            selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select ${template.name} template`}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedTemplate(template.id)}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            {getTemplateIcon(template.category)}
                            <span className="font-semibold">{template.name}</span>
                            {template.ats_optimized && (
                              <Badge variant="secondary">ATS Safe</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline">{template.category}</Badge>
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            Font: {template.styling.font_family.split(',')[0]} • 
                            Size: {template.styling.font_size}pt
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTemplateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
                      disabled={!selectedTemplate || applyingTemplate}
                    >
                      {applyingTemplate ? "Applying..." : "Apply Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {selectedTemplate && (
                <Button 
                  onClick={() => applyTemplate(selectedTemplate)}
                  disabled={applyingTemplate || !resumeId}
                >
                  {applyingTemplate ? "Applying..." : "Apply Selected"}
                </Button>
              )}
            </div>
            
            {!resumeId && (
              <p className="text-xs text-slate-500">Save your resume first to apply templates</p>
            )}
          </div>
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
          <div className="mt-2 flex items-center gap-2">
            <Button variant="outline" onClick={lintSummaryAI} disabled={!form.summary?.trim() || lintSummary.loading}>
              {lintSummary.loading ? "Linting..." : "Lint with AI"}
            </Button>
          </div>
          {lintSummary.issues?.length > 0 && (
            <div className="mt-2 text-xs text-slate-700">
              <div className="font-medium">Issues</div>
              <ul className="list-disc pl-5">
                {lintSummary.issues.map((i, idx) => (
                  <li key={idx}><span className="font-semibold">{i.type}:</span> {i.message} {i.suggestion ? `– ${i.suggestion}` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {lintSummary.suggestions?.length > 0 && (
            <div className="mt-2 text-xs text-slate-700">
              <div className="font-medium">Suggestions</div>
              <ul className="list-disc pl-5">
                {lintSummary.suggestions.map((s, idx) => (<li key={idx}>{s}</li>))}
              </ul>
            </div>
          )}
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
                  <div key={bi} className="mt-2 flex flex-col gap-1">
                    <div className="flex gap-2">
                      <Input value={b} onChange={(e) => {
                        const copy = [...form.experience]; copy[idx].bullets[bi] = e.target.value; setForm({ ...form, experience: copy });
                      }} placeholder="Impact-oriented bullet" />
                      <Button variant="outline" onClick={() => rewriteBullet(idx, bi)} disabled={rewriting === keyFor(idx, bi)}>
                        {rewriting === keyFor(idx, bi) ? "Rewriting..." : "Rewrite with AI"}
                      </Button>
                      <Button variant="ghost" onClick={() => lintBulletAI(idx, bi)} disabled={bulletLint[keyFor(idx, bi)]?.loading}>Lint</Button>
                    </div>
                    {bulletLint[keyFor(idx, bi)]?.issues?.length > 0 && (
                      <div className="text-[11px] text-slate-700">
                        <ul className="list-disc pl-5">
                          {bulletLint[keyFor(idx, bi)].issues.map((ii, j) => (
                            <li key={j}><span className="font-semibold">{ii.type}:</span> {ii.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
            <Button className="btn-cta" onClick={validateLocale} variant="outline">
              <ShieldCheck className="h-4 w-4" /> Validate preset
            </Button>
            <Button className="btn-cta" onClick={saveResume} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
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
              <CardTitle className="h-heading">Import/Export</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Import Section */}
                <div>
                  <Label>Import Resume (PDF)</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileImport}
                      disabled={importing}
                      className="hidden"
                      id="file-import"
                    />
                    <label
                      htmlFor="file-import"
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {importing ? "Importing..." : "Import PDF"}
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Max 5MB, PDF format only</p>
                </div>

                {/* Export Section */}
                <div>
                  <Label>Export Resume</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button variant="outline" onClick={exportPDF} disabled={!resumeId}>
                      <FileText className="h-4 w-4" />PDF
                    </Button>
                    <Button variant="outline" onClick={exportJSON} disabled={!resumeId}>
                      <FileText className="h-4 w-4" />JSON
                    </Button>
                  </div>
                  {!resumeId && (
                    <p className="text-xs text-slate-500 mt-1">Save resume first to export</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t bg-white/70">
        <div className="container-xl py-6 text-sm text-slate-600">© {new Date().getFullYear()} AtlasCV. ATS-safe builder.</div>
      </footer>

      {/* Import Result Modal */}
      {showImportModal && importResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {importResult.success ? "Import Successful" : "Import Failed"}
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className={importResult.success ? "text-green-700" : "text-red-700"}>
                {importResult.message}
              </p>
              
              {importResult.warnings?.length > 0 && (
                <div>
                  <h3 className="font-medium text-amber-700 mb-2">Warnings:</h3>
                  <ul className="list-disc pl-5 text-amber-600 text-sm space-y-1">
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {importResult.success && importResult.extracted_data && (
                <div>
                  <h3 className="font-medium mb-2">Extracted Information:</h3>
                  <div className="text-sm space-y-2 bg-slate-50 p-3 rounded">
                    <p><strong>Name:</strong> {importResult.extracted_data.contact?.full_name || "Not detected"}</p>
                    <p><strong>Email:</strong> {importResult.extracted_data.contact?.email || "Not detected"}</p>
                    <p><strong>Phone:</strong> {importResult.extracted_data.contact?.phone || "Not detected"}</p>
                    <p><strong>Skills:</strong> {importResult.extracted_data.skills?.length || 0} detected</p>
                    <p><strong>Experience:</strong> {importResult.extracted_data.experience?.length || 0} entries</p>
                    <p><strong>Education:</strong> {importResult.extracted_data.education?.length || 0} entries</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={() => setShowImportModal(false)} variant="outline">
                Cancel
              </Button>
              {importResult.success && (
                <Button onClick={applyImportedData} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Apply Imported Data
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
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