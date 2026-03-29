"use client";

import { useState, useRef } from "react";
import { Application, api } from "@/lib/api";
import {
  X,
  ExternalLink,
  MapPin,
  DollarSign,
  ScanSearch,
  Mail,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
} from "lucide-react";

interface Props {
  application: Application;
  onClose: () => void;
  onUpdated: (app: Application) => void;
}

export function JobDetailPanel({ application, onClose, onUpdated }: Props) {
  const [editingRole, setEditingRole] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [roleValue, setRoleValue] = useState(application.role);
  const [companyValue, setCompanyValue] = useState(application.company);

  // ATS Scanner state
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [showAtsForm, setShowAtsForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Outreach state
  const [nameInput, setNameInput] = useState("");
  const [backgroundInput, setBackgroundInput] = useState("");
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showOutreachForm, setShowOutreachForm] = useState(false);

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file);
    setResumeParsing(true);
    try {
      const { text } = await api.parseResume(file);
      setResumeText(text);
    } catch (err) {
      console.error("Failed to parse resume:", err);
    } finally {
      setResumeParsing(false);
    }
  };

  const handleScan = async () => {
    if (!resumeText.trim()) return;
    setScanLoading(true);
    try {
      const result = await api.atsScan(application.id, resumeText.trim());
      onUpdated({ ...application, ats_score: result.ats_score, ats_breakdown: result.ats_breakdown });
    } catch (err) {
      console.error("ATS scan failed:", err);
    } finally {
      setScanLoading(false);
    }
  };

  const saveField = async (field: "role" | "company", value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === application[field]) return;
    try {
      const updated = await api.updateApplication(application.id, { [field]: trimmed } as Partial<Application>);
      onUpdated(updated);
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleGenerateOutreach = async () => {
    if (!nameInput.trim() || !backgroundInput.trim()) return;
    setOutreachLoading(true);
    try {
      const result = await api.generateOutreach(application.id, nameInput.trim(), backgroundInput.trim());
      onUpdated({ ...application, outreach_draft: result.body });
    } catch (err) {
      console.error("Failed to generate outreach:", err);
    } finally {
      setOutreachLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";
  const barColor = (score: number) =>
    score >= 70 ? "bg-green-400" : score >= 40 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="fixed top-[73px] right-0 w-[420px] border-l border-[--border] bg-[--card] h-[calc(100vh-73px)] overflow-y-auto z-40 shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-[--card] z-10 p-5 border-b border-[--border]">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            {editingCompany ? (
              <input
                autoFocus
                value={companyValue}
                onChange={(e) => setCompanyValue(e.target.value)}
                onBlur={() => { setEditingCompany(false); saveField("company", companyValue); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setEditingCompany(false); saveField("company", companyValue); }
                  if (e.key === "Escape") { setEditingCompany(false); setCompanyValue(application.company); }
                }}
                className="text-xs font-semibold uppercase tracking-wide text-[--accent] bg-transparent border-b border-[--accent] outline-none w-full mb-1"
              />
            ) : (
              <p
                className="text-xs text-[--accent] font-semibold uppercase tracking-wide mb-1 cursor-pointer hover:opacity-70"
                onClick={() => setEditingCompany(true)}
                title="Click to edit"
              >
                {application.company}
              </p>
            )}
            {editingRole ? (
              <input
                autoFocus
                value={roleValue}
                onChange={(e) => setRoleValue(e.target.value)}
                onBlur={() => { setEditingRole(false); saveField("role", roleValue); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setEditingRole(false); saveField("role", roleValue); }
                  if (e.key === "Escape") { setEditingRole(false); setRoleValue(application.role); }
                }}
                className="text-lg font-bold leading-tight bg-transparent border-b border-[--border] outline-none w-full"
              />
            ) : (
              <h2
                className="text-lg font-bold leading-tight cursor-pointer hover:opacity-70"
                onClick={() => setEditingRole(true)}
                title="Click to edit"
              >
                {application.role}
              </h2>
            )}
          </div>
          <button onClick={onClose} className="text-[--muted] hover:text-[--foreground] p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-[--muted]">
          {application.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {application.location}
            </span>
          )}
          {application.salary_range && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {application.salary_range}
            </span>
          )}
          {application.url && (
            <a href={application.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[--accent]">
              <ExternalLink className="w-3.5 h-3.5" />
              View posting
            </a>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Description */}
        {application.description && (
          <section>
            <h3 className="text-sm font-semibold mb-2">About the Role</h3>
            <p className="text-sm text-[--muted] leading-relaxed">{application.description}</p>
          </section>
        )}

        {/* Requirements */}
        {application.requirements && application.requirements.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-2">Requirements</h3>
            <ul className="space-y-1.5">
              {application.requirements.map((req, i) => (
                <li key={i} className="text-sm text-[--muted] flex gap-2">
                  <span className="text-[--accent] mt-0.5">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ATS Scanner */}
        <section className="border border-[--border] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAtsForm(!showAtsForm)}
            className="w-full flex items-center justify-between p-4 hover:bg-[--background] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ScanSearch className="w-4 h-4 text-[--accent]" />
              ATS Scanner
              {application.ats_score != null && (
                <span className={`text-xs font-bold ml-1 ${scoreColor(application.ats_score)}`}>
                  {application.ats_score}/100
                </span>
              )}
            </span>
            {showAtsForm ? <ChevronUp className="w-4 h-4 text-[--muted]" /> : <ChevronDown className="w-4 h-4 text-[--muted]" />}
          </button>

          {showAtsForm && (
            <div className="px-4 pb-4 space-y-3">
              {/* Upload zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
              />
              {resumeFile && resumeText ? (
                <div className="flex items-center gap-2 bg-[--background] border border-[--border] rounded-lg px-3 py-2 text-sm">
                  <FileText className="w-4 h-4 text-[--accent] flex-shrink-0" />
                  <span className="truncate text-[--muted]">{resumeFile.name}</span>
                  <button
                    onClick={() => { setResumeFile(null); setResumeText(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="ml-auto text-[--muted] hover:text-[--foreground]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={resumeParsing}
                  className="w-full flex flex-col items-center gap-2 border border-dashed border-[--border] hover:border-[--accent] rounded-lg px-3 py-5 text-sm text-[--muted] hover:text-[--foreground] transition-colors disabled:opacity-50"
                >
                  {resumeParsing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>Reading PDF...</span></>
                  ) : (
                    <><Upload className="w-5 h-5" /><span>Upload Resume PDF</span></>
                  )}
                </button>
              )}

              <button
                onClick={handleScan}
                disabled={scanLoading || !resumeText.trim()}
                className="flex items-center gap-2 bg-[--accent] hover:bg-[--accent-hover] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
              >
                {scanLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Scanning...</>
                ) : (
                  <><ScanSearch className="w-4 h-4" />Scan Resume</>
                )}
              </button>

              {/* Results */}
              {application.ats_score != null && application.ats_breakdown && (
                <div className="border border-[--border] rounded-lg p-4 space-y-4">
                  {/* Score bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold">ATS Score</p>
                      <span className={`text-lg font-bold ${scoreColor(application.ats_score)}`}>
                        {application.ats_score}
                        <span className="text-xs font-normal text-[--muted]">/100</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[--background] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(application.ats_score)}`}
                        style={{ width: `${application.ats_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Per-category breakdown */}
                  {(() => {
                    const bd = application.ats_breakdown!;
                    const SECTION_LABELS: Record<string, string> = {
                      required_skills: "Required Skills",
                      tools: "Tools & Platforms",
                      preferred_skills: "Preferred Skills",
                      experience: "Experience",
                      education: "Education",
                      certifications: "Certifications",
                    };
                    const SECTION_ORDER = ["required_skills", "tools", "preferred_skills", "experience", "education", "certifications"];

                    const sections = SECTION_ORDER
                      .filter((key) => key in bd && key !== "suggestions")
                      .map((key) => ({ key, label: SECTION_LABELS[key] ?? key, data: (bd as Record<string, { matched: string[]; missing: string[] }>)[key] }))
                      .filter((s) => s.data.matched.length + s.data.missing.length > 0);

                    return (
                      <div className="space-y-4">
                        {sections.map(({ key, label, data }) => {
                          const total = data.matched.length + data.missing.length;
                          const pct = total > 0 ? Math.round((data.matched.length / total) * 100) : 100;
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide">
                                  {label}
                                </p>
                                <span className={`text-[10px] font-bold ${pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                                  {data.matched.length}/{total}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {data.matched.map((k) => (
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                    ✓ {k}
                                  </span>
                                ))}
                                {data.missing.map((k) => (
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                    ✗ {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {bd.suggestions && bd.suggestions.length > 0 && (
                          <div className="pt-2 border-t border-[--border] space-y-1.5">
                            <p className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide mb-1">Suggestions</p>
                            {bd.suggestions.map((s: string, i: number) => (
                              <p key={i} className="text-[11px] text-[--muted] leading-relaxed">• {s}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Cold Outreach */}
        <section className="border border-[--border] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowOutreachForm(!showOutreachForm)}
            className="w-full flex items-center justify-between p-4 hover:bg-[--background] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="w-4 h-4 text-[--accent]" />
              Cold Outreach Draft
            </span>
            {showOutreachForm ? <ChevronUp className="w-4 h-4 text-[--muted]" /> : <ChevronDown className="w-4 h-4 text-[--muted]" />}
          </button>

          {showOutreachForm && (
            <div className="px-4 pb-4 space-y-3">
              {!application.outreach_draft ? (
                <>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-[--background] border border-[--border] rounded-lg px-3 py-2 text-sm outline-none focus:border-[--accent] transition-colors"
                  />
                  <textarea
                    value={backgroundInput}
                    onChange={(e) => setBackgroundInput(e.target.value)}
                    placeholder="Quick background — school, current internship, key skills..."
                    rows={3}
                    className="w-full bg-[--background] border border-[--border] rounded-lg px-3 py-2 text-sm outline-none focus:border-[--accent] resize-none transition-colors"
                  />
                  <button
                    onClick={handleGenerateOutreach}
                    disabled={outreachLoading || !nameInput.trim() || !backgroundInput.trim()}
                    className="flex items-center gap-2 bg-[--accent] hover:bg-[--accent-hover] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                  >
                    {outreachLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Drafting...</>
                    ) : (
                      <><Mail className="w-4 h-4" />Generate Outreach Email</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-[--background] rounded-lg p-3">
                    <p className="text-sm text-[--foreground] whitespace-pre-wrap leading-relaxed">
                      {application.outreach_draft}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(application.outreach_draft!); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }}
                    className="flex items-center gap-2 text-sm text-[--muted] hover:text-[--foreground] transition-colors"
                  >
                    {copiedEmail ? (
                      <><Check className="w-3.5 h-3.5 text-green-400" />Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />Copy to clipboard</>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Notes</h3>
          <textarea
            defaultValue={application.notes || ""}
            onBlur={async (e) => {
              if (e.target.value !== (application.notes || "")) {
                try {
                  const updated = await api.updateApplication(application.id, { notes: e.target.value } as Partial<Application>);
                  onUpdated(updated);
                } catch (err) {
                  console.error("Failed to save notes:", err);
                }
              }
            }}
            placeholder="Add notes about this application..."
            rows={3}
            className="w-full bg-[--background] border border-[--border] rounded-lg px-3 py-2 text-sm outline-none focus:border-[--accent] resize-none transition-colors"
          />
        </section>
      </div>
    </div>
  );
}
