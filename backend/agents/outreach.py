import json
import re
from utils.llm_client import LLMConfig, generate

SYSTEM_PROMPT = """You are a professional career coach who writes highly personalized cold outreach messages.
Fill in the provided templates with specific, accurate information from the candidate's resume and job description.
Use ONLY facts from the resume — never invent metrics or experiences.
Return ONLY valid JSON, no markdown, no explanations."""

_CONTEXT_BLOCK = """
RESUME:
{resume_json}

JOB DESCRIPTION:
{job_description}

ROLE: {role_title}
KEY EMPHASIS: {emphasis}

ADDITIONAL PERSONAL NOTES:
{personal_notes}
"""

BOTH_PROMPT = _CONTEXT_BLOCK + """
LINKEDIN NOTE TEMPLATE (fill in all [placeholders]):
{linkedin_template}

EMAIL TEMPLATE (fill in all [placeholders]):
{email_template}

RULES:
- Replace every [placeholder] with specific content from the resume/JD
- LinkedIn note MUST be ≤300 characters (hard LinkedIn limit) — count carefully
- Use only real information from the resume; never invent metrics
- Email must follow the template structure exactly
- If an image was provided, incorporate any relevant details from it

Return JSON:
{{
  "linkedin_note": "...",
  "email": "...",
  "company": "...",
  "role_title": "..."
}}"""

LINKEDIN_PROMPT = _CONTEXT_BLOCK + """
LINKEDIN NOTE TEMPLATE (fill in all [placeholders]):
{linkedin_template}

RULES:
- Replace every [placeholder] with specific content from the resume/JD
- MUST be ≤300 characters (hard LinkedIn limit) — count carefully
- Use only real information from the resume
- If an image was provided, incorporate any relevant details from it

Return JSON:
{{
  "linkedin_note": "...",
  "company": "...",
  "role_title": "..."
}}"""

EMAIL_PROMPT = _CONTEXT_BLOCK + """
EMAIL TEMPLATE (fill in all [placeholders]):
{email_template}

RULES:
- Replace every [placeholder] with specific content from the resume/JD
- Follow the template structure exactly
- Use only real information from the resume
- If an image was provided, incorporate any relevant details from it

Return JSON:
{{
  "email": "...",
  "company": "...",
  "role_title": "..."
}}"""

DEFAULT_LINKEDIN_TEMPLATE = "Hi [Recruiter Name], I saw the [Job Title] at [Company] and wanted to connect. [1 sentence about your most relevant experience from the resume]. Would love to learn more!"

DEFAULT_EMAIL_TEMPLATE = """Hi [Recruiter Name],

I saw the [Job Title] role at [Company] and wanted to reach out as my background aligns closely with the work your team is doing.

[2-3 sentences highlighting your most relevant experience — be specific with company names, exact technologies, and real metrics from your resume that map directly to this role's requirements.]

I would appreciate the opportunity to connect and would be grateful if you could please review my attached resume.

Thank you,
[Your Name]"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == "```"), len(lines))
        text = "\n".join(lines[1:end])
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        return json.loads(match.group())
    return json.loads(text.strip())


def _build_prompt(template: str, parsed_resume: dict, research: dict, job_description: str,
                  linkedin_template: str, email_template: str, personal_notes: str) -> str:
    return template.format(
        resume_json=json.dumps(parsed_resume, indent=2),
        job_description=job_description,
        role_title=research.get("role_title", ""),
        emphasis=", ".join(research.get("what_to_emphasize", [])[:4]),
        linkedin_template=linkedin_template or DEFAULT_LINKEDIN_TEMPLATE,
        email_template=email_template or DEFAULT_EMAIL_TEMPLATE,
        personal_notes=personal_notes or "None provided.",
    )


async def generate_outreach(
    parsed_resume: dict,
    research: dict,
    job_description: str,
    llm: LLMConfig,
    linkedin_template: str = "",
    email_template: str = "",
    personal_notes: str = "",
    target: str = "both",
    context_image_bytes: bytes | None = None,
    context_image_media_type: str = "image/jpeg",
) -> dict:
    kwargs = dict(
        parsed_resume=parsed_resume,
        research=research,
        job_description=job_description,
        linkedin_template=linkedin_template,
        email_template=email_template,
        personal_notes=personal_notes,
    )

    if target == "linkedin":
        prompt = _build_prompt(LINKEDIN_PROMPT, **kwargs)
    elif target == "email":
        prompt = _build_prompt(EMAIL_PROMPT, **kwargs)
    else:
        prompt = _build_prompt(BOTH_PROMPT, **kwargs)

    text = await generate(
        llm, prompt, SYSTEM_PROMPT,
        image_bytes=context_image_bytes,
        image_media_type=context_image_media_type,
    )
    result = _extract_json(text)

    # Enforce 300-char limit on LinkedIn note
    note = result.get("linkedin_note", "")
    if note and len(note) > 300:
        result["linkedin_note"] = note[:297] + "..."

    return result
