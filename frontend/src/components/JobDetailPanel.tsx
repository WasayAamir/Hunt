"use client";

import { useState, useRef } from "react";
import { Application, api } from "@/lib/api";
import {
  X,
  ExternalLink,
  MapPin,
  DollarSign,
  Sparkles,
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
  const [experienceInput, setExperienceInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameInput, setNameInput] = useState("");
  const [backgroundInput, setBackgroundInput] = useState("");
  const [bulletsLoading, setBulletsLoading] = useState(false);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [copiedBullets, setCopiedBullets] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showBulletForm, setShowBulletForm] = useState(false);
  const [showOutreachForm, setShowOutreachForm] = useState(false);

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file);
    setResumeParsing(true);
    try {
      const { text } = await api.parseResume(file);
      setExperienceInput(text);
    } catch (err) {
      console.error("Failed to parse resume:", err);
    } finally {
      setResumeParsing(false);
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

  const handleGenerateBullets = async () => {
    if (!experienceInput.trim()) return;
    setBulletsLoading(true);
    try {
      const result = await api.generateBullets(
        application.id,
        experienceInput.trim()
      );
      onUpdated({
        ...application,
        resume_bullets: result.bullets,
        matched_skills: result.skill_matches,
        missing_skills: result.skill_gaps,
      });
    } catch (err) {
      console.error("Failed to generate bullets:", err);
    } finally {
      setBulletsLoading(false);
    }
  };

  const handleGenerateOutreach = async () => {
    if (!nameInput.trim() || !backgroundInput.trim()) return;
    setOutreachLoading(true);
    try {
      const result = await api.generateOutreach(
        application.id,
        nameInput.trim(),
        backgroundInput.trim()
      );
      onUpdated({
        ...application,
        outreach_draft: result.body,
      });
    } catch (err) {
      console.error("Failed to generate outreach:", err);
    } finally {
      setOutreachLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "bullets" | "email") => {
    navigator.clipboard.writeText(text);
    if (type === "bullets") {
      setCopiedBullets(true);
      setTimeout(() => setCopiedBullets(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

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
                onKeyDown={(e) => { if (e.key === "Enter") { setEditingCompany(false); saveField("company", companyValue); } if (e.key === "Escape") { setEditingCompany(false); setCompanyValue(application.company); } }}
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
                onKeyDown={(e) => { if (e.key === "Enter") { setEditingRole(false); saveField("role", roleValue); } if (e.key === "Escape") { setEditingRole(false); setRoleValue(application.role); } }}
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
          <button
            onClick={onClose}
            className="text-[--muted] hover:text-[--foreground] p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta row */}
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
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[--accent]"
            >
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
            <p className="text-sm text-[--muted] leading-relaxed">
              {application.description}
            </p>
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

        {/* AI Resume Bullets */}
        <section className="border border-[--border] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowBulletForm(!showBulletForm)}
            className="w-full flex items-center justify-between p-4 hover:bg-[--background] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-[--accent]" />
              Resume Bullets
            </span>
            {showBulletForm ? (
              <ChevronUp className="w-4 h-4 text-[--muted]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[--muted]" />
            )}
          </button>

          {showBulletForm && (
            <div className="px-4 pb-4 space-y-3">
              {!application.resume_bullets ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
                  />
                  {resumeFile && experienceInput ? (
                    <div className="flex items-center gap-2 bg-[--background] border border-[--border] rounded-lg px-3 py-2 text-sm">
                      <FileText className="w-4 h-4 text-[--accent] flex-shrink-0" />
                      <span className="truncate text-[--muted]">{resumeFile.name}</span>
                      <button
                        onClick={() => { setResumeFile(null); setExperienceInput(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                    onClick={handleGenerateBullets}
                    disabled={bulletsLoading || !experienceInput.trim()}
                    className="flex items-center gap-2 bg-[--accent] hover:bg-[--accent-hover] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                  >
                    {bulletsLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />Generate Tailored Bullets</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <ul className="space-y-2">
                    {application.resume_bullets.map((bullet, i) => (
                      <li
                        key={i}
                        className="text-sm text-[--foreground] bg-[--background] p-2.5 rounded-md"
                      >
                        • {bullet}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        application.resume_bullets!.map((b) => `• ${b}`).join("\n"),
                        "bullets"
                      )
                    }
                    className="flex items-center gap-2 text-sm text-[--muted] hover:text-[--foreground] transition-colors"
                  >
                    {copiedBullets ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy to clipboard
                      </>
                    )}
                  </button>

                  {/* Skill Analysis */}
                  {(application.matched_skills?.length || application.missing_skills?.length) && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {application.matched_skills && application.matched_skills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-400 mb-1">
                            Matching Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {application.matched_skills.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {application.missing_skills && application.missing_skills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-400 mb-1">
                            Skill Gaps
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {application.missing_skills.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* AI Cold Outreach */}
        <section className="border border-[--border] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowOutreachForm(!showOutreachForm)}
            className="w-full flex items-center justify-between p-4 hover:bg-[--background] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="w-4 h-4 text-[--accent]" />
              Cold Outreach Draft
            </span>
            {showOutreachForm ? (
              <ChevronUp className="w-4 h-4 text-[--muted]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[--muted]" />
            )}
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
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Drafting...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Generate Outreach Email
                      </>
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
                    onClick={() =>
                      copyToClipboard(application.outreach_draft!, "email")
                    }
                    className="flex items-center gap-2 text-sm text-[--muted] hover:text-[--foreground] transition-colors"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy to clipboard
                      </>
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
                  const updated = await api.updateApplication(application.id, {
                    notes: e.target.value,
                  } as Partial<Application>);
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
