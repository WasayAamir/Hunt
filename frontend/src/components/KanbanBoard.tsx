"use client";

import { Application } from "@/lib/api";
import { JobCard } from "./JobCard";
import {
  Bookmark,
  Send,
  FileCode,
  MessageSquare,
  Trophy,
  Ghost,
  XCircle,
} from "lucide-react";

const COLUMNS = [
  { id: "saved", label: "Saved", icon: Bookmark, color: "#64748b" },
  { id: "applied", label: "Applied", icon: Send, color: "#4c6ef5" },
  { id: "oa", label: "OA", icon: FileCode, color: "#f59e0b" },
  { id: "interview", label: "Interview", icon: MessageSquare, color: "#a855f7" },
  { id: "offer", label: "Offer", icon: Trophy, color: "#22c55e" },
  { id: "ghosted", label: "Ghosted", icon: Ghost, color: "#ef4444" },
  { id: "rejected", label: "Rejected", icon: XCircle, color: "#6b7280" },
];

interface Props {
  applications: Application[];
  onStatusChange: (id: string, newStatus: string) => void;
  onCardClick: (app: Application) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
}

export function KanbanBoard({
  applications,
  onStatusChange,
  onCardClick,
  onDelete,
  selectedId,
}: Props) {
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData("applicationId", appId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("applicationId");
    if (appId) {
      onStatusChange(appId, status);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnApps = applications.filter(
          (app) => app.status === column.id
        );
        const Icon = column.icon;

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-[220px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <Icon
                className="w-4 h-4"
                style={{ color: column.color }}
              />
              <span className="text-sm font-medium text-[--foreground]">
                {column.label}
              </span>
              <span className="text-xs text-[--muted] ml-auto bg-[--card] px-1.5 py-0.5 rounded">
                {columnApps.length}
              </span>
            </div>

            {/* Cards */}
            <div className="kanban-column space-y-2">
              {columnApps.map((app) => (
                <JobCard
                  key={app.id}
                  application={app}
                  isSelected={app.id === selectedId}
                  onClick={() => onCardClick(app)}
                  onDelete={() => onDelete(app.id)}
                  onDragStart={(e) => handleDragStart(e, app.id)}
                />
              ))}

              {columnApps.length === 0 && (
                <div className="border border-dashed border-[--border] rounded-lg p-4 text-center text-xs text-[--muted]">
                  Drag jobs here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
