"use client";

import { useState, useEffect, useCallback } from "react";
import { Application, api } from "@/lib/api";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AddJobModal } from "@/components/AddJobModal";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { Crosshair, Plus, RefreshCw } from "lucide-react";

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const data = await api.getApplications();
      setApplications(data);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateApplication(id, { status: newStatus } as Partial<Application>);
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleJobAdded = (newApp: Application) => {
    setApplications((prev) => [newApp, ...prev]);
    setShowAddModal(false);
    setSelectedApp(newApp);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      if (selectedApp?.id === id) setSelectedApp(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleAppUpdated = (updated: Application) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updated.id ? updated : app))
    );
    setSelectedApp(updated);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[--border] px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Crosshair className="w-7 h-7 text-[--accent]" />
            <h1 className="text-xl font-bold tracking-tight">Hunt</h1>
            <span className="text-xs text-[--muted] bg-[--card] px-2 py-0.5 rounded-full">
              {applications.length} tracked
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchApplications}
              className="p-2 rounded-lg text-[--muted] hover:text-[--foreground] hover:bg-[--card] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[--accent] hover:bg-[--accent-hover] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Job
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex max-w-[1600px] mx-auto">
        {/* Kanban Board */}
        <div className={`flex-1 p-6 transition-all ${selectedApp ? "pr-0" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-[--muted]">
              Loading your applications...
            </div>
          ) : (
            <KanbanBoard
              applications={applications}
              onStatusChange={handleStatusChange}
              onCardClick={setSelectedApp}
              onDelete={handleDelete}
              selectedId={selectedApp?.id || null}
            />
          )}
        </div>

        {/* Detail Panel */}
        {selectedApp && (
          <JobDetailPanel
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            onUpdated={handleAppUpdated}
          />
        )}
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onJobAdded={handleJobAdded}
        />
      )}
    </main>
  );
}
