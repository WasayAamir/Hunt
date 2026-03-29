import re
import os
import json
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

_groq_client = None

def _get_groq():
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import AsyncGroq
        _groq_client = AsyncGroq(api_key=api_key)
        return _groq_client
    except Exception:
        return None


async def _chat(prompt: str) -> str | None:
    client = _get_groq()
    if not client:
        return None
    try:
        resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return None


def _first(patterns: list[str], text: str, fallback: str = "") -> str:
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(1).strip()
    return fallback


def _company_from_url(url: str) -> str:
    """Extract company name from common job board URL patterns."""
    if not url:
        return ""
    try:
        p = urlparse(url)
        host = p.hostname or ""
        path_parts = [x for x in p.path.split("/") if x]
        GENERIC = {"jobs", "careers", "boards", "www", "job", "apply", "en", "en-us", "us", "alljobs", "mydayforce"}

        # workday: gsk.wd5.myworkdayjobs.com → GSK
        m = re.match(r"^([a-z0-9\-]+)\.wd\d+\.myworkdayjobs\.com", host)
        if m:
            return m.group(1).replace("-", " ").upper()

        # lever: jobs.lever.co/company/...
        if "lever.co" in host and path_parts:
            return path_parts[0].replace("-", " ").title()

        # greenhouse: boards.greenhouse.io/company or company.greenhouse.io
        if "greenhouse.io" in host:
            if host.startswith("boards.") and path_parts:
                return path_parts[0].replace("-", " ").title()
            sub = host.split(".")[0]
            if sub not in GENERIC:
                return sub.replace("-", " ").title()

        # smartrecruiters: jobs.smartrecruiters.com/Company
        if "smartrecruiters.com" in host and path_parts:
            return path_parts[0].replace("-", " ").title()

        # icims: company.icims.com
        if "icims.com" in host:
            sub = host.split(".")[0]
            if sub not in GENERIC:
                return sub.replace("-", " ").title()

        # taleo: company.taleo.net
        if "taleo.net" in host:
            sub = host.split(".")[0]
            if sub not in GENERIC:
                return sub.replace("-", " ").title()

        # dayforce: en-US/CompanyName/...
        if "dayforcehcm.com" in host and len(path_parts) >= 2:
            candidate = path_parts[1]
            if candidate.lower() not in GENERIC:
                return candidate.replace("-", " ").title()

        # successfactors: company.successfactors.com
        if "successfactors" in host:
            sub = host.split(".")[0]
            if sub not in GENERIC:
                return sub.replace("-", " ").title()

        # jobvite: jobs.jobvite.com/company
        if "jobvite.com" in host and path_parts:
            return path_parts[0].replace("-", " ").title()

        # Generic: careers.company.com or jobs.company.com → company
        parts = host.split(".")
        if parts[0] in ("careers", "jobs", "boards") and len(parts) >= 3:
            return parts[1].replace("-", " ").title()

    except Exception:
        pass
    return ""


def _parse_company(text: str, url: str = "") -> str:
    first_line = text.split("\n")[0]

    # "Role | Company Jobs" in page title
    m = re.search(r"\|\s*(.+?)(?:\s+Jobs?|Careers?|Hiring)?\s*$", first_line, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # "Role - Company" in page title
    m = re.search(r"-\s*([A-Z][A-Za-z0-9&., ]{2,40})\s*$", first_line)
    if m:
        return m.group(1).strip()

    # URL-based extraction (reliable for known job boards)
    url_company = _company_from_url(url)
    if url_company:
        return url_company

    # Text-based fallbacks
    return _first([
        r"^([A-Z][A-Za-z0-9&., ]{2,40})\s+is (?:a |an )",
        r"(?:About|Join)\s+([A-Z][A-Za-z0-9&., ]{2,40})\b",
    ], text, "Unknown Company")


def _parse_role(text: str) -> str:
    # Workday "Job Title page is loaded" pattern
    m = re.search(r"^(.+?)\s+page is loaded$", text, re.MULTILINE | re.IGNORECASE)
    if m:
        candidate = m.group(1).strip()
        if 3 < len(candidate) < 100:
            return candidate

    first_line = text.split("\n")[0].strip()

    # "Role | Company" — take everything before the pipe
    if "|" in first_line:
        candidate = first_line.split("|")[0].strip()
        if 3 < len(candidate) < 80:
            return candidate

    # "Role - Company" — take the part before the dash when followed by a capital
    m = re.search(r"^([A-Za-z][A-Za-z0-9& /\-,()]{3,60}?)\s+[-–]\s+[A-Z]", first_line)
    if m:
        return m.group(1).strip()

    # Scan first 15 non-empty lines for something that looks like a job title
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    title_kw = (
        r"engineer|developer|analyst|designer|manager|intern|student|scientist|"
        r"architect|lead|senior|junior|associate|specialist|consultant|director|"
        r"coordinator|devops|sre|qa|sdet|data|software|hardware|product|research|"
        r"marketing|finance|operations|summer|co-op|coop|technician|administrator"
    )
    for line in lines[:15]:
        if (5 < len(line) < 80
                and not re.search(
                    r"http|cookie|menu|nav|sign in|apply|login|careers|jobs\b|skip|"
                    r"main content|page is loaded",
                    line, re.I)
                and re.search(title_kw, line, re.I)):
            return line.split("|")[0].strip() if "|" in line else line

    return _first([
        r"(?:job title|position|role)[:\s]+([^\n]{5,60})",
    ], text, "Unknown Role")


def _extract_description(text: str) -> str:
    """Extract up to 3000 chars of meaningful job content, skipping nav/cookie noise."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    kept = []
    total = 0
    for line in lines:
        if re.search(r"http|cookie|©|privacy|terms|sign in|log in|skip|page is loaded", line, re.I):
            continue
        if len(line) < 30:
            continue
        kept.append(line)
        total += len(line)
        if total >= 3000:
            break
    return " ".join(kept) if kept else ""


def _extract_requirements(text: str) -> list[str]:
    """Pull bullet/dash requirement lines from the raw job posting."""
    reqs = []
    in_section = False
    for line in text.split("\n"):
        line = line.strip()
        if re.search(r"\b(qualifications?|requirements?|what you.ll need|you have|must.have|skills)\b", line, re.I):
            in_section = True
            continue
        if in_section:
            if re.match(r"^[-•*·▪▸]\s+.{10,}", line):
                reqs.append(re.sub(r"^[-•*·▪▸]\s+", "", line))
            elif re.match(r"^\d+[.)]\s+.{10,}", line):
                reqs.append(re.sub(r"^\d+[.)]\s+", "", line))
            elif line and not re.match(r"^[-•*·▪▸\d]", line) and len(line) > 60:
                reqs.append(line)
            # Stop if we hit a new section header
            if re.search(r"\b(benefits?|perks|compensation|about us|who we are|equal opportunity)\b", line, re.I):
                break
        if len(reqs) >= 15:
            break
    return reqs


async def parse_job_description(raw_text: str, url: str = "") -> dict:
    """Extract structured job data from raw scraped text."""
    company = _parse_company(raw_text, url)
    role = _parse_role(raw_text)
    location = _first([
        r"Location[:\s]+([^\n]{3,60})",
        r"(?:based in|office in|located in)\s+([^\n,]{3,50})",
        r"(Remote|Hybrid|On-?site)[^\n]{0,30}",
    ], raw_text)
    salary = _first([
        r"(\$[\d,]+(?:\.\d+)?\s*[-–to]+\s*\$[\d,]+(?:\.\d+)?(?:\s*/\s*(?:yr|year|hr|hour|annum))?)",
        r"((?:USD|CAD|GBP)\s*[\d,]+\s*[-–]\s*[\d,]+)",
        r"salary[:\s]+([^\n]{5,50})",
    ], raw_text)

    description = _extract_description(raw_text)
    requirements = _extract_requirements(raw_text)

    return {
        "company": company,
        "role": role,
        "location": location or None,
        "salary_range": salary or None,
        "description": description,
        "requirements": requirements,
        "nice_to_haves": [],
    }


# ---------------------------------------------------------------------------
# Synonym map for semantic ATS matching (abbrev ↔ full form, common variants)
# ---------------------------------------------------------------------------
_SYNONYMS: list[frozenset] = [
    frozenset({"ml", "machine learning"}),
    frozenset({"ai", "artificial intelligence"}),
    frozenset({"dl", "deep learning"}),
    frozenset({"nlp", "natural language processing"}),
    frozenset({"cv", "computer vision"}),
    frozenset({"llm", "large language model", "large language models"}),
    frozenset({"js", "javascript"}),
    frozenset({"ts", "typescript"}),
    frozenset({"k8s", "kubernetes"}),
    frozenset({"tf", "tensorflow"}),
    frozenset({"react", "reactjs", "react.js"}),
    frozenset({"node", "nodejs", "node.js"}),
    frozenset({"vue", "vuejs", "vue.js"}),
    frozenset({"aws", "amazon web services"}),
    frozenset({"gcp", "google cloud platform", "google cloud"}),
    frozenset({"azure", "microsoft azure"}),
    frozenset({"ci/cd", "cicd", "continuous integration", "continuous deployment"}),
    frozenset({"rest", "restful", "rest api", "rest apis"}),
    frozenset({"c#", "csharp", "c sharp"}),
    frozenset({"c++", "cpp"}),
    frozenset({"bi", "business intelligence"}),
    frozenset({"etl", "extract transform load"}),
    frozenset({"iac", "infrastructure as code"}),
    frozenset({"devops", "dev ops"}),
    frozenset({"mlops", "ml ops"}),
    frozenset({"oop", "object-oriented", "object oriented programming"}),
    frozenset({"nosql", "no-sql", "non-relational database"}),
    frozenset({"sql", "structured query language"}),
]


def _get_variants(term: str) -> frozenset:
    t = term.lower().strip()
    for group in _SYNONYMS:
        if t in group:
            return group
    return frozenset({t})


def _skill_in_text(skill: str, text: str) -> bool:
    """Return True if skill or any synonym appears in text (case-insensitive, word-boundary aware)."""
    text_lower = text.lower()
    for variant in _get_variants(skill):
        pattern = r"(?<!\w)" + re.escape(variant) + r"(?!\w)"
        if re.search(pattern, text_lower):
            return True
    return False


def _score_section(items: list[str], resume_text: str) -> dict:
    matched, missing = [], []
    for item in items:
        (matched if _skill_in_text(item, resume_text) else missing).append(item)
    return {"matched": matched, "missing": missing}


def _compute_ats(jd_reqs: dict, resume_text: str) -> dict:
    required = _score_section(jd_reqs.get("required_hard_skills", []), resume_text)
    preferred = _score_section(jd_reqs.get("preferred_hard_skills", []), resume_text)
    tools = _score_section(jd_reqs.get("tools", []), resume_text)
    experience = _score_section(jd_reqs.get("experience_areas", []), resume_text)

    def _pct(cat: dict) -> float:
        total = len(cat["matched"]) + len(cat["missing"])
        return len(cat["matched"]) / total if total else 1.0

    score = round(
        (_pct(required) * 0.40 + _pct(tools) * 0.25 + _pct(preferred) * 0.20 + _pct(experience) * 0.15) * 100
    )

    suggestions: list[str] = []
    if required["missing"]:
        suggestions.append(f"Add missing required skills: {', '.join(required['missing'][:5])}")
    if tools["missing"]:
        suggestions.append(f"Consider mentioning these tools: {', '.join(tools['missing'][:4])}")
    if preferred["missing"]:
        suggestions.append(f"Nice-to-have skills to develop: {', '.join(preferred['missing'][:3])}")

    return {
        "ats_score": min(score, 100),
        "required_skills": required,
        "preferred_skills": preferred,
        "tools": tools,
        "experience": experience,
        "suggestions": suggestions,
    }


async def generate_resume_bullets(
    job_requirements: list[str],
    job_description: str,
    user_experience: str,
) -> dict:
    jd_combined = job_description + "\n" + "\n".join(job_requirements)

    prompt = f"""You are a career coach and ATS analyzer.

JOB DESCRIPTION:
{jd_combined[:2000]}

CANDIDATE RESUME:
{user_experience[:3000]}

Tasks:
1. Write 4-5 strong resume bullet points using real experiences from the resume most relevant to this job. Use action verbs and include metrics/numbers where present. Do NOT invent anything not in the resume.
2. Parse the resume into sections: skills (hard/tech skills only), experience_areas (key things they have done), education, certifications, projects.
3. Parse the JD into: required_hard_skills, preferred_hard_skills, tools (specific tech tools/platforms), experience_areas.

Respond ONLY with valid JSON, no extra text:
{{
  "bullets": ["bullet 1", "bullet 2"],
  "resume_sections": {{
    "skills": ["Python", "SQL"],
    "experience_areas": ["built REST APIs", "data analysis"],
    "education": ["Computer Science"],
    "certifications": [],
    "projects": []
  }},
  "jd_requirements": {{
    "required_hard_skills": ["Python", "SQL"],
    "preferred_hard_skills": ["Go"],
    "tools": ["AWS", "Docker"],
    "experience_areas": ["microservices", "distributed systems"]
  }}
}}"""

    raw = await _chat(prompt)
    if raw:
        try:
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            data = json.loads(raw)
            bullets = data.get("bullets", [])
            jd_reqs = data.get("jd_requirements", {})
            ats = _compute_ats(jd_reqs, user_experience)
            all_matched = list(dict.fromkeys(
                ats["required_skills"]["matched"] +
                ats["tools"]["matched"] +
                ats["preferred_skills"]["matched"]
            ))
            all_missing = list(dict.fromkeys(
                ats["required_skills"]["missing"] +
                ats["tools"]["missing"] +
                ats["preferred_skills"]["missing"]
            ))
            return {
                "bullets": bullets,
                "skill_matches": all_matched[:12],
                "skill_gaps": all_missing[:12],
                "ats_score": ats["ats_score"],
                "ats_breakdown": {
                    "required_skills": ats["required_skills"],
                    "preferred_skills": ats["preferred_skills"],
                    "tools": ats["tools"],
                    "experience": ats["experience"],
                    "suggestions": ats["suggestions"],
                },
            }
        except Exception:
            pass

    # Fallback: regex bullets + basic keyword match
    sentences = re.split(r"(?<=[.!?])\s+|\n", user_experience)
    bullets = []
    for s in sentences:
        s = s.strip()
        if 40 < len(s) < 200 and re.search(
            r"\b(built|developed|designed|led|implemented|created|improved|automated|managed|analyzed|deployed|reduced|increased)\b",
            s, re.I,
        ):
            bullets.append(s)
        if len(bullets) == 5:
            break
    req_words = set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{2,}\b", jd_combined))
    resume_words = set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{2,}\b", user_experience))
    return {
        "bullets": bullets or ["Could not extract bullets — try a text-based PDF or paste your experience manually."],
        "skill_matches": sorted(req_words & resume_words)[:8],
        "skill_gaps": sorted(req_words - resume_words)[:6],
        "ats_score": 0,
        "ats_breakdown": None,
    }


async def scan_resume_ats(
    job_description: str,
    requirements: list[str],
    resume_text: str,
) -> dict:
    """One Groq call parses JD + resume into structured sections, then section-aware deterministic scoring."""
    jd_combined = job_description + "\n" + "\n".join(requirements)

    prompt = f"""You are an expert ATS parser. Extract structured data from both the job description and resume below.

JOB DESCRIPTION:
{jd_combined[:2500]}

RESUME:
{resume_text[:3000]}

Return ONLY valid JSON (no extra text, no markdown fences):
{{
  "jd_parsed": {{
    "required_hard_skills": ["Python", "SQL"],
    "preferred_hard_skills": ["Go", "Rust"],
    "tools_and_platforms": ["AWS", "Docker", "GitHub Actions"],
    "experience_requirements": ["3+ years REST API design", "led cross-functional teams"],
    "education_requirements": ["Bachelor in Computer Science"],
    "certifications_required": []
  }},
  "resume_parsed": {{
    "skills": ["Python", "SQL", "React", "Docker"],
    "experience_highlights": ["Built REST APIs at Acme Corp", "Led team of 5 engineers", "Deployed ML pipelines on AWS"],
    "education": ["B.S. Computer Science, MIT 2022"],
    "certifications": ["AWS Solutions Architect Associate"],
    "projects": ["ML classifier achieving 94% accuracy", "Web scraper using Python and BeautifulSoup"]
  }}
}}

Extraction rules:
- required_hard_skills: ONLY explicitly required technical/hard skills from the JD
- preferred_hard_skills: skills listed as "nice to have", "preferred", "bonus", or "plus" in the JD
- tools_and_platforms: specific named tools, frameworks, cloud platforms (e.g. Docker, PostgreSQL, Kubernetes)
- experience_requirements: experience-level phrases from JD (e.g. "5+ years backend", "experience with microservices", "team leadership")
- resume skills: ONLY hard/technical skills explicitly listed in the resume (skills section, summary, or clearly stated)
- resume experience_highlights: key accomplishments and technologies actually used in each job role
- resume projects: technical projects with the skills/tools actually used in each"""

    raw = await _chat(prompt)
    if raw:
        try:
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            data = json.loads(raw)
            jd = data.get("jd_parsed", {})
            res = data.get("resume_parsed", {})

            # Build isolated section text — never mix sections to avoid false positives
            skills_text = " ".join(res.get("skills", []))
            experience_text = " ".join(res.get("experience_highlights", []))
            projects_text = " ".join(res.get("projects", []))
            education_text = " ".join(res.get("education", []))
            certs_text = " ".join(res.get("certifications", []))

            # Technical content: skills + experience + projects (for hard skills and tools)
            tech_text = " ".join([skills_text, experience_text, projects_text])

            # Section-aware matching: each JD category checked against the relevant resume section(s)
            required = _score_section(jd.get("required_hard_skills", []), tech_text)
            preferred = _score_section(jd.get("preferred_hard_skills", []), tech_text)
            tools = _score_section(jd.get("tools_and_platforms", []), tech_text)
            # Experience requirements checked against experience + projects only (not skills list)
            experience = _score_section(jd.get("experience_requirements", []), experience_text + " " + projects_text)
            education = _score_section(jd.get("education_requirements", []), education_text)
            certifications = _score_section(jd.get("certifications_required", []), certs_text)

            def _pct(cat: dict) -> float:
                total = len(cat["matched"]) + len(cat["missing"])
                return len(cat["matched"]) / total if total else 1.0

            # Weighted score: required skills and tools matter most
            score = round(
                (_pct(required) * 0.40 + _pct(tools) * 0.25 + _pct(preferred) * 0.20 + _pct(experience) * 0.15) * 100
            )

            suggestions: list[str] = []
            if required["missing"]:
                suggestions.append(f"Add missing required skills to your resume: {', '.join(required['missing'][:5])}")
            if tools["missing"]:
                suggestions.append(f"Mention these tools if you have experience: {', '.join(tools['missing'][:4])}")
            if experience["missing"]:
                suggestions.append(f"Highlight experience with: {', '.join(experience['missing'][:3])}")
            if preferred["missing"]:
                suggestions.append(f"Nice-to-have skills to develop: {', '.join(preferred['missing'][:3])}")

            breakdown: dict = {
                "required_skills": required,
                "preferred_skills": preferred,
                "tools": tools,
                "experience": experience,
                "suggestions": suggestions,
            }
            if education["matched"] or education["missing"]:
                breakdown["education"] = education
            if certifications["matched"] or certifications["missing"]:
                breakdown["certifications"] = certifications

            return {"ats_score": min(score, 100), "ats_breakdown": breakdown}
        except Exception:
            pass

    # Fallback: basic regex keyword match against raw text
    req_words = set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{2,}\b", jd_combined))
    resume_words = set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{2,}\b", resume_text))
    matched = sorted(req_words & resume_words)[:12]
    missing = sorted(req_words - resume_words)[:12]
    score = round(len(matched) / max(len(matched) + len(missing), 1) * 100)
    return {
        "ats_score": score,
        "ats_breakdown": {
            "required_skills": {"matched": matched, "missing": missing},
            "preferred_skills": {"matched": [], "missing": []},
            "tools": {"matched": [], "missing": []},
            "experience": {"matched": [], "missing": []},
            "suggestions": ["Could not fully analyze — try re-scanning with a more detailed job description."],
        },
    }


async def generate_outreach_email(
    company: str,
    role: str,
    job_description: str,
    user_name: str,
    user_background: str,
) -> dict:
    prompt = f"""Write a short, genuine cold outreach email for a job application.

Applicant: {user_name}
Background: {user_background[:500]}
Role: {role} at {company}
Job Description: {job_description[:800]}

Write a concise 3-paragraph email (intro, value pitch, call to action). Sound human, not templated.

Respond ONLY with valid JSON, no extra text:
{{"subject": "...", "body": "..."}}"""

    raw = await _chat(prompt)
    if raw:
        try:
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            data = json.loads(raw)
            return {
                "subject": data.get("subject", f"Interest in {role} at {company}"),
                "body": data.get("body", ""),
            }
        except Exception:
            pass

    return {
        "subject": f"Interest in {role} at {company}",
        "body": (
            f"Hi,\n\n"
            f"I came across the {role} role at {company} and wanted to reach out directly. "
            f"I'm {user_name} — {user_background[:120]}.\n\n"
            f"I'd love to bring my background to {company} and contribute meaningfully. "
            f"I've attached my resume and would appreciate any time for a quick chat.\n\n"
            f"Thanks,\n{user_name}"
        ),
    }
