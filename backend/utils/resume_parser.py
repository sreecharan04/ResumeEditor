import io
import json
from docx import Document
import pdfplumber
from utils.llm_client import LLMConfig, generate

PARSE_PROMPT = """You are an expert resume parser. Parse the following resume text into a structured JSON format.

RESUME TEXT:
{resume_text}

Return a JSON object with EXACTLY this structure (use null for missing fields, [] for missing arrays):
{{
  "name": "Full name",
  "contact": {{
    "email": "email or null",
    "phone": "phone or null",
    "location": "city, state or null",
    "linkedin": "linkedin URL or handle or null",
    "github": "github URL or handle or null",
    "website": "personal website or null"
  }},
  "summary": "professional summary paragraph or null",
  "experience": [
    {{
      "id": "exp_0",
      "company": "Company name",
      "title": "Job title",
      "location": "City, State or null",
      "dates": "Start – End",
      "bullets": ["bullet 1", "bullet 2"]
    }}
  ],
  "education": [
    {{
      "id": "edu_0",
      "institution": "University name",
      "degree": "BS/MS/PhD/etc",
      "field": "Field of study or null",
      "dates": "Graduation year or date range",
      "gpa": "GPA if listed or null",
      "details": ["honors, relevant coursework, etc."]
    }}
  ],
  "skills": [
    {{
      "category": "Category (Languages, Frameworks, Tools, etc.)",
      "items": ["skill1", "skill2"]
    }}
  ],
  "projects": [
    {{
      "id": "proj_0",
      "name": "Project name",
      "description": "Brief description",
      "technologies": "tech stack string or null",
      "bullets": ["achievement 1"]
    }}
  ]
}}

Return ONLY valid JSON, no markdown, no explanations."""


def _extract_text_from_pdf(content: bytes) -> str:
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _extract_text_from_docx(content: bytes) -> str:
    doc = Document(io.BytesIO(content))
    return "\n".join(para.text for para in doc.paragraphs)


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == "```"), len(lines))
        text = "\n".join(lines[1:end])
    return json.loads(text.strip())


async def parse_resume(file_content: bytes, filename: str, llm: LLMConfig) -> dict:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        raw_text = _extract_text_from_pdf(file_content)
    elif ext in ("docx", "doc"):
        raw_text = _extract_text_from_docx(file_content)
    else:
        raw_text = file_content.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        raise ValueError("Could not extract text from the resume file.")

    text = await generate(llm, PARSE_PROMPT.format(resume_text=raw_text))
    return _extract_json(text)
