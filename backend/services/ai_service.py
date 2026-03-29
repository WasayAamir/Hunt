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
    """Extract the first substantial paragraph from the job posting."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # Skip short nav/header lines at the top, collect the first meaty paragraph
    paragraphs = []
    for line in lines:
        if len(line) > 80 and not re.search(
            r"http|cookie|©|privacy|terms|sign in|log in|skip|page is loaded", line, re.I
        ):
            paragraphs.append(line)
        if len(paragraphs) == 3:
            break
    return " ".join(paragraphs) if paragraphs else ""


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

    # Extract a description paragraph from the raw text
    description = _extract_description(raw_text)

    return {
        "company": company,
        "role": role,
        "location": location or None,
        "salary_range": salary or None,
        "description": description,
        "requirements": [],
        "nice_to_haves": [],
    }


async def generate_resume_bullets(
    job_requirements: list[str],
    job_description: str,
    user_experience: str,
) -> dict:
    prompt = f"""You are a career coach helping tailor a resume for a specific job.

JOB DESCRIPTION:
{job_description[:1500]}

JOB REQUIREMENTS:
{chr(10).join(f'- {r}' for r in job_requirements[:10])}

CANDIDATE RESUME:
{user_experience[:3000]}

Tasks:
1. Write 4-5 strong resume bullet points using real experiences from the candidate's resume most relevant to this job. Use action verbs and include metrics/numbers where present in the resume. Do NOT invent anything not in the resume.
2. List skills from the resume that match the job requirements.
3. List skills the job requires that are missing from the resume.

Respond ONLY with valid JSON, no extra text:
{{
  "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "skill_matches": ["skill 1", "skill 2"],
  "skill_gaps": ["gap 1", "gap 2"]
}}"""

    raw = await _chat(prompt)
    if raw:
        try:
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            data = json.loads(raw)
            return {
                "bullets": data.get("bullets", []),
                "skill_matches": data.get("skill_matches", []),
                "skill_gaps": data.get("skill_gaps", []),
            }
        except Exception:
            pass

    # Fallback: extract action-verb sentences + keyword matching
    req_keywords = set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{1,20}\b", " ".join(job_requirements)))
    sentences = re.split(r"(?<=[.!?])\s+|\n", user_experience)
    bullets = []
    for s in sentences:
        s = s.strip()
        if 40 < len(s) < 200 and re.search(
            r"\b(built|developed|designed|led|implemented|created|improved|automated|managed|analyzed|deployed|reduced|increased)\b", s, re.I
        ):
            bullets.append(s)
        if len(bullets) == 5:
            break
    resume_words = set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{1,20}\b", user_experience))
    return {
        "bullets": bullets or ["Could not extract bullets — try a text-based PDF or paste your experience manually."],
        "skill_matches": sorted(req_keywords & resume_words)[:8],
        "skill_gaps": sorted(req_keywords - resume_words)[:6],
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
