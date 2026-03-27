"use client";

import { useState } from "react";
import { Application, api } from "@/lib/api";
import { X, Link, Loader2, Sparkles, PenLine } from "lucide-react";

interface Props {
  onClose: () => void;
  onJobAdded: (app: Application) => void;
}

export function AddJobModal({ onClose, onJobAdded }: Props) {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleParseUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const app = await api.parseJob(url.trim());
      onJobAdded(app);
    } catch (err) {
      setError("Failed to parse that URL. Try pasting the job description manually or adding it by hand.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!company.trim() || !role.trim()) return;
    setLoading(true);
    setError("");
    try {
      const app = await api.createApplication({
        company: company.trim(),
        role: role.trim(),
        location: location.trim() || null,
        status: "saved",
      });
      onJobAdded(app);
    } catch (err) {
      setError("Failed to add application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[--card] border border-[--border] rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[--border]">
          <h2 className="text-lg font-semibold">Add Job</h2>
          <button
            onClick={onClose}
            className="text-[--muted] hover:text-[--foreground] p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 p-2 mx-5 mt-4 bg-[--background] rounded-lg">
          <button
            onClick={() => setMode("url")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-colors ${
              mode === "url"
                ? "bg-[--card] text-[--foreground] shadow-sm"
                : "text-[--muted] hover:text-[--foreground]"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Paste URL
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-colors ${
              mode === "manual"
                ? "bg-[--card] text-[--foreground] shadow-sm"
                : "text-[--muted] hover:text-[--foreground]"
            }`}
          >
            <PenLine className="w-4 h-4" />
            Add Manually
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {mode === "url" ? (
            <>
              <div>
                <label className="block text-sm text-[--muted] mb-1.5">
                  Job Posting URL
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-[--background] border border-[--border] rounded-lg px-3 focus-within:border-[--accent] transition-colors">
                    <Link className="w-4 h-4 text-[--muted] flex-shrink-0" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://jobs.lever.co/company/role..."
                      className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[--muted]/50"
                      onKeyDown={(e) => e.key === "Enter" && handleParseUrl()}
                      autoFocus
                    />
                  </div>
                </div>
                <p className="text-xs text-[--muted] mt-2">
                  AI will extract the company, role, requirements, and more.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-[--muted] mb-1.5">
                  Company *
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Anthropic"
                  className="w-full bg-[--background] border border-[--border] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[--accent] transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-[--muted] mb-1.5">
                  Role *
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Software Engineer Intern"
                  className="w-full bg-[--background] border border-[--border] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[--accent] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[--muted] mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA (Remote)"
                  className="w-full bg-[--background] border border-[--border] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[--accent] transition-colors"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-[--danger] bg-red-500/10 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[--border] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[--muted] hover:text-[--foreground] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={mode === "url" ? handleParseUrl : handleManualAdd}
            disabled={loading || (mode === "url" ? !url.trim() : !company.trim() || !role.trim())}
            className="flex items-center gap-2 bg-[--accent] hover:bg-[--accent-hover] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "url" ? "Parsing..." : "Adding..."}
              </>
            ) : mode === "url" ? (
              <>
                <Sparkles className="w-4 h-4" />
                Parse & Add
              </>
            ) : (
              "Add Job"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
