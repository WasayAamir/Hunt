const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface Application {
  id: string;
  company: string;
  role: string;
  url: string | null;
  location: string | null;
  salary_range: string | null;
  status: string;
  description: string | null;
  requirements: string[] | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  resume_bullets: string[] | null;
  outreach_draft: string | null;
  notes: string | null;
  applied_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedJob {
  company: string;
  role: string;
  location: string | null;
  salary_range: string | null;
  description: string;
  requirements: string[];
  nice_to_haves: string[];
}

export const api = {
  async getApplications(): Promise<Application[]> {
    const res = await fetch(`${API_BASE}/api/applications`);
    if (!res.ok) throw new Error("Failed to fetch applications");
    return res.json();
  },

  async createApplication(data: Partial<Application>): Promise<Application> {
    const res = await fetch(`${API_BASE}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create application");
    return res.json();
  },

  async updateApplication(
    id: string,
    data: Partial<Application>
  ): Promise<Application> {
    const res = await fetch(`${API_BASE}/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update application");
    return res.json();
  },

  async deleteApplication(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/applications/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete application");
  },

  async parseJob(url: string): Promise<Application> {
    const res = await fetch(`${API_BASE}/api/parse-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error("Failed to parse job posting");
    return res.json();
  },

  async generateBullets(
    applicationId: string,
    userExperience: string
  ): Promise<{ bullets: string[]; skill_matches: string[]; skill_gaps: string[] }> {
    const res = await fetch(`${API_BASE}/api/generate-bullets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        user_experience: userExperience,
      }),
    });
    if (!res.ok) throw new Error("Failed to generate bullets");
    return res.json();
  },

  async generateOutreach(
    applicationId: string,
    userName: string,
    userBackground: string
  ): Promise<{ subject: string; body: string }> {
    const res = await fetch(`${API_BASE}/api/generate-outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        user_name: userName,
        user_background: userBackground,
      }),
    });
    if (!res.ok) throw new Error("Failed to generate outreach");
    return res.json();
  },
};
