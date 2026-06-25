import io
import os
import json
import pathlib
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any

from agents.researcher import research_job_description
from agents.editor import edit_resume
from agents.outreach import generate_outreach
from utils.resume_parser import parse_resume
from utils.llm_client import LLMConfig
from utils.docx_generator import generate_docx
from utils.pdf_generator import generate_pdf

app = FastAPI(title="Resume Editor API")

_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFS_FILE = pathlib.Path(__file__).parent / "user_preferences.json"

DEFAULT_MODELS = {
    "gemini": "gemini-2.0-flash",
    "openai": "gpt-4o",
    "anthropic": "claude-sonnet-4-6",
}

ENV_KEY_VARS = {
    "gemini": "GOOGLE_API_KEY",
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


def _load_prefs() -> dict:
    if PREFS_FILE.exists():
        try:
            return json.loads(PREFS_FILE.read_text())
        except Exception:
            pass
    return {}


def _build_llm_config(prefs: dict) -> LLMConfig:
    provider = prefs.get("active_provider") or "gemini"
    model = prefs.get("active_model") or DEFAULT_MODELS.get(provider, "gemini-2.0-flash")
    key_field = f"{provider}_key"
    api_key = prefs.get(key_field) or os.environ.get(ENV_KEY_VARS.get(provider, ""), "")
    return LLMConfig(provider=provider, model=model, api_key=api_key)


# ── Preferences ────────────────────────────────────────────────────────────────

class Preferences(BaseModel):
    personal_rules: str = ""
    linkedin_template: str = ""
    email_template: str = ""
    outreach_personal_notes: str = ""
    active_provider: str = "gemini"
    active_model: str = ""
    gemini_key: str = ""
    openai_key: str = ""
    anthropic_key: str = ""


@app.get("/api/preferences", response_model=Preferences)
async def get_preferences():
    if PREFS_FILE.exists():
        try:
            return json.loads(PREFS_FILE.read_text())
        except Exception:
            pass
    return Preferences()


@app.post("/api/preferences", response_model=Preferences)
async def save_preferences(prefs: Preferences):
    PREFS_FILE.write_text(json.dumps(prefs.model_dump(), indent=2))
    return prefs


# ── Resume editing ─────────────────────────────────────────────────────────────

@app.post("/api/edit-resume")
async def edit_resume_endpoint(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    personal_rules: str = Form(default=""),
    active_provider: str = Form(default=""),
    active_model: str = Form(default=""),
    api_key: str = Form(default=""),
):
    # Client sends its own provider/key — use those directly (multi-user safe).
    # Fall back to server prefs file only for self-hosted / local dev.
    if active_provider and api_key:
        llm = LLMConfig(
            provider=active_provider,
            model=active_model or DEFAULT_MODELS.get(active_provider, ""),
            api_key=api_key,
        )
    else:
        prefs = _load_prefs()
        llm = _build_llm_config(prefs)
    if not llm.api_key:
        raise HTTPException(
            status_code=400,
            detail=f"No API key set for '{llm.provider}'. Add it in the Settings tab."
        )

    try:
        file_content = await resume.read()
        filename = resume.filename or "resume.pdf"

        parsed_resume = await parse_resume(file_content, filename, llm)
        research_result = await research_job_description(job_description, llm)
        edit_result = await edit_resume(parsed_resume, research_result, personal_rules, llm)

        return {
            "research": research_result,
            "original_resume": parsed_resume,
            "resume": edit_result.get("resume", parsed_resume),
            "changes_summary": edit_result.get("changes_summary", ""),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# ── Outreach generation ────────────────────────────────────────────────────────

@app.post("/api/generate-outreach")
async def generate_outreach_endpoint(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    linkedin_template: str = Form(default=""),
    email_template: str = Form(default=""),
    personal_notes: str = Form(default=""),
    active_provider: str = Form(default=""),
    active_model: str = Form(default=""),
    api_key: str = Form(default=""),
    generate_target: str = Form(default="both"),
    context_image: UploadFile | None = File(default=None),
):
    if active_provider and api_key:
        llm = LLMConfig(
            provider=active_provider,
            model=active_model or DEFAULT_MODELS.get(active_provider, ""),
            api_key=api_key,
        )
    else:
        prefs = _load_prefs()
        llm = _build_llm_config(prefs)
    if not llm.api_key:
        raise HTTPException(
            status_code=400,
            detail=f"No API key set for '{llm.provider}'. Add it in the Settings tab."
        )

    try:
        file_content = await resume.read()
        filename = resume.filename or "resume.pdf"

        context_image_bytes = None
        context_image_media_type = "image/jpeg"
        if context_image:
            context_image_bytes = await context_image.read()
            context_image_media_type = context_image.content_type or "image/jpeg"

        parsed_resume = await parse_resume(file_content, filename, llm)
        research_result = await research_job_description(job_description, llm)
        outreach_result = await generate_outreach(
            parsed_resume, research_result, job_description, llm,
            linkedin_template=linkedin_template,
            email_template=email_template,
            personal_notes=personal_notes,
            target=generate_target,
            context_image_bytes=context_image_bytes,
            context_image_media_type=context_image_media_type,
        )
        return outreach_result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Outreach generation failed: {str(e)}")


# ── Image text extraction ──────────────────────────────────────────────────────

@app.post("/api/extract-text-from-image")
async def extract_text_from_image(
    image: UploadFile = File(...),
    active_provider: str = Form(default=""),
    active_model: str = Form(default=""),
    api_key: str = Form(default=""),
):
    from utils.llm_client import generate as llm_generate
    if active_provider and api_key:
        llm = LLMConfig(
            provider=active_provider,
            model=active_model or DEFAULT_MODELS.get(active_provider, ""),
            api_key=api_key,
        )
    else:
        prefs = _load_prefs()
        llm = _build_llm_config(prefs)
    if not llm.api_key:
        raise HTTPException(status_code=400, detail=f"No API key set for '{llm.provider}'.")

    try:
        image_bytes = await image.read()
        media_type = image.content_type or "image/jpeg"
        text = await llm_generate(
            llm,
            "Extract all text from this image exactly as written. "
            "If it is a job posting or job description, preserve the full text and structure. "
            "Return ONLY the extracted text with no commentary.",
            image_bytes=image_bytes,
            image_media_type=media_type,
        )
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


# ── Downloads ──────────────────────────────────────────────────────────────────

class DownloadRequest(BaseModel):
    resume: dict[str, Any]


@app.post("/api/download")
async def download_resume(request: DownloadRequest):
    try:
        docx_bytes = generate_docx(request.resume)
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": 'attachment; filename="resume.docx"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@app.post("/api/download-pdf")
async def download_resume_pdf(request: DownloadRequest):
    try:
        pdf_bytes = generate_pdf(request.resume)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="resume.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
