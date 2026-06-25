import json
from utils.llm_client import LLMConfig, generate

SYSTEM_PROMPT = """You are an expert resume editor who specializes in tailoring resumes to specific job descriptions.

Your core principles:
- Rewrite and strengthen existing bullet points using stronger action verbs
- Incorporate relevant keywords naturally — do not keyword-stuff
- Follow all personal rules without exception
- Preserve all original IDs (exp_0, edu_0, proj_0, etc.) unchanged
- Return ONLY valid JSON, no markdown, no explanations
- CRITICAL: Write ALL resume text in plain text only — NO backticks, NO asterisks, NO markdown formatting of any kind"""

USER_PROMPT = """Edit the resume to better match the job description research, following the personal rules strictly.

PERSONAL RULES (HIGHEST PRIORITY — MUST FOLLOW):
{personal_rules}

JOB RESEARCH (contains specific tool names and ATS keywords):
{research_result}

ORIGINAL RESUME:
{resume_json}

Instructions:
1. Rewrite bullet points with stronger action verbs and quantified impact
   (use existing numbers only — do not invent metrics)
2. Weave in specific tool names and ATS keywords from the research into existing bullet points naturally
3. Reorder skills arrays so the most JD-relevant tools appear first within each category
4. Set "summary" to null — do NOT include a summary section in the output
5. Keep all section IDs IDENTICAL to the original (exp_0, edu_0, etc.)
6. Write PLAIN TEXT only in all resume fields — no backticks, no asterisks, no markdown

Return this JSON structure:
{{
  "resume": {{ ...complete edited resume with same structure as input... }},
  "changes_summary": "Concise description of what was changed and why"
}}"""


def _strip_backticks(obj):
    if isinstance(obj, str):
        return obj.replace("`", "")
    if isinstance(obj, dict):
        return {k: _strip_backticks(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_strip_backticks(item) for item in obj]
    return obj


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == "```"), len(lines))
        text = "\n".join(lines[1:end])
    return json.loads(text.strip())


async def edit_resume(
    parsed_resume: dict,
    research_result: dict,
    personal_rules: str,
    llm: LLMConfig,
) -> dict:
    text = await generate(
        llm,
        USER_PROMPT.format(
            personal_rules=personal_rules or "No specific rules provided.",
            research_result=json.dumps(research_result, indent=2),
            resume_json=json.dumps(parsed_resume, indent=2),
        ),
        SYSTEM_PROMPT,
    )
    result = _extract_json(text)
    result["resume"] = _strip_backticks(result.get("resume", {}))
    return result
