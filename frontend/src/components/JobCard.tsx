"use client";

import { Application } from "@/lib/api";
import { Trash2, MapPin, ExternalLink } from "lucide-react";

interface Props {
  application: Application;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

export function JobCard({
  application,
  isSelected,
  onClick,
  onDelete,
  onDragStart,
}: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`group relative bg-[--card] border rounded-lg p-3 cursor-pointer transition-all hover:bg-[--card-hover] ${
        isSelected
          ? "border-[--accent] ring-1 ring-[--accent]"
          : "border-[--border]"
      }`}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[--muted] hover:text-[--danger] transition-all p-1 rounded"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Company */}
      <p className="text-xs text-[--muted] font-medium uppercase tracking-wide mb-1 pr-6">
        {application.company}
      </p>

      {/* Role */}
      <p className="text-sm font-semibold text-[--foreground] leading-snug mb-2">
        {application.role}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-[--muted]">
        {application.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {application.location}
          </span>
        )}
        {application.url && (
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 hover:text-[--accent]"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Skill indicators */}
      {application.matched_skills && application.matched_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {application.matched_skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400"
            >
              {skill}
            </span>
          ))}
          {application.missing_skills && application.missing_skills.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
              +{application.missing_skills.length} gaps
            </span>
          )}
        </div>
      )}
    </div>
  );
}
