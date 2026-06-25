import json
from utils.llm_client import LLMConfig, generate

SYSTEM_PROMPT = """You are a senior technical recruiter with deep knowledge of software engineering tools, frameworks, and hiring trends.

Your job is to analyze job descriptions and extract SPECIFIC, ACTIONABLE intelligence — not vague concepts.

HARD RULES:
- Return specific TOOL NAMES, FRAMEWORK NAMES, LIBRARY NAMES (e.g., "Kubernetes", "React", "LangChain", "PostgreSQL")
- NEVER return vague phrases like "Software development", "Data structures", "Algorithms", "Debugging", "Systems thinking"
- When the JD uses vague language, infer the specific tools the industry uses for that role
- Example: JD says "distributed systems" → infer Kafka, Redis, Kubernetes, gRPC, etcd
- Example: JD says "machine learning pipelines" → infer PyTorch, MLflow, Kubeflow, Airflow, Ray
- Example: JD says "frontend development" → infer React/Angular/Vue, TypeScript, Webpack, Jest
- Look inside full sentences, not just bullet points — tools often appear inline in descriptions

Return ONLY valid JSON, no markdown, no explanations."""

USER_PROMPT = """Analyze this job description and extract specific tool/technology intelligence.

Job Description:
{job_description}

Return a JSON object with these exact fields:

{{
  "role_title": "exact job title from the JD",
  "role_level": "junior|mid|senior|lead|principal|staff",
  "tools_explicitly_mentioned": [
    "exact tool/framework/library names found in the JD text (e.g. Kubernetes, React, PostgreSQL)"
  ],
  "tools_implied_by_context": [
    "specific tools commonly required for this role that the JD implies but doesn't name — be specific, use real tool names"
  ],
  "keywords_for_ats": [
    "exact phrases from the JD that an ATS would scan for — include both tool names and domain terms like 'microservices', 'CI/CD', 'LLM fine-tuning'"
  ],
  "what_to_emphasize": [
    "specific aspects of the candidate's background to highlight — reference actual technologies (e.g., 'Emphasize Kubernetes experience', not 'Emphasize cloud skills')"
  ],
  "role_summary": "2-3 sentence description of what this role actually does day-to-day",
  "role_level_signals": "brief note on seniority signals — what the JD implies about experience level"
}}"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == "```"), len(lines))
        text = "\n".join(lines[1:end])
    return json.loads(text.strip())


async def research_job_description(job_description: str, llm: LLMConfig) -> dict:
    text = await generate(
        llm,
        USER_PROMPT.format(job_description=job_description),
        SYSTEM_PROMPT,
    )
    return _extract_json(text)
