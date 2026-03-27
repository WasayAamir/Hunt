import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-20250514"


async def parse_job_description(raw_text: str) -> dict:
    """Extract structured job data from raw scraped text."""
    message = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": f"""Extract structured job posting data from the following text.
Respond with ONLY valid JSON, no markdown or explanation.

JSON schema:
{{
  "company": "string",
  "role": "string",
  "location": "string or null",
  "salary_range": "string or null",
  "description": "1-2 sentence summary of the role",
  "requirements": ["list of required skills/qualifications"],
  "nice_to_haves": ["list of preferred/bonus qualifications"]
}}

Job posting text:
{raw_text}""",
            }
        ],
    )

    text = message.content[0].text.strip()
    text = text.removeprefix("```json").removesuffix("```").strip()
    return json.loads(text)


async def generate_resume_bullets(
    job_requirements: list[str],
    job_description: str,
    user_experience: str,
) -> dict:
    """Generate tailored resume bullets and skill analysis."""
    message = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": f"""You are a resume coach for software engineering interns/new grads.

Given the job requirements and the user's experience, generate:
1. 4-6 tailored resume bullet points (using strong action verbs, quantified where possible)
2. Skills from the job that match the user's experience
3. Skill gaps the user should be aware of

Respond with ONLY valid JSON:
{{
  "bullets": ["bullet 1", "bullet 2", ...],
  "skill_matches": ["skill 1", "skill 2", ...],
  "skill_gaps": ["skill 1", "skill 2", ...]
}}

Job description: {job_description}
Requirements: {json.dumps(job_requirements)}

User's experience:
{user_experience}""",
            }
        ],
    )

    text = message.content[0].text.strip()
    text = text.removeprefix("```json").removesuffix("```").strip()
    return json.loads(text)


async def generate_outreach_email(
    company: str,
    role: str,
    job_description: str,
    user_name: str,
    user_background: str,
) -> dict:
    """Generate a cold outreach email draft."""
    message = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[
            {
                "role": "user",
                "content": f"""Write a short, genuine cold outreach email for a software engineering
intern/new grad applying to a role. Avoid sounding generic or AI-generated.
Keep it under 150 words. Be specific to the company and role.

Respond with ONLY valid JSON:
{{
  "subject": "email subject line",
  "body": "email body text"
}}

Company: {company}
Role: {role}
About the role: {job_description}
Sender name: {user_name}
Sender background: {user_background}""",
            }
        ],
    )

    text = message.content[0].text.strip()
    text = text.removeprefix("```json").removesuffix("```").strip()
    return json.loads(text)
