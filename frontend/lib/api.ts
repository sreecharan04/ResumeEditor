import { EditResumeResponse, OutreachResult, ResumeData, Preferences } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function editResume(
  resumeFile: File,
  jobDescription: string,
  personalRules: string,
  activeProvider: string,
  activeModel: string,
  apiKey: string,
): Promise<EditResumeResponse> {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("job_description", jobDescription);
  formData.append("personal_rules", personalRules);
  formData.append("active_provider", activeProvider);
  formData.append("active_model", activeModel);
  formData.append("api_key", apiKey);

  const res = await fetch(`${API_BASE}/api/edit-resume`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }

  return res.json();
}

export async function generateOutreach(
  resumeFile: File,
  jobDescription: string,
  linkedinTemplate: string,
  emailTemplate: string,
  personalNotes: string,
  activeProvider: string,
  activeModel: string,
  apiKey: string,
  target: "both" | "linkedin" | "email" = "both",
  contextImage?: File,
): Promise<OutreachResult> {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("job_description", jobDescription);
  formData.append("linkedin_template", linkedinTemplate);
  formData.append("email_template", emailTemplate);
  formData.append("personal_notes", personalNotes);
  formData.append("active_provider", activeProvider);
  formData.append("active_model", activeModel);
  formData.append("api_key", apiKey);
  formData.append("generate_target", target);
  if (contextImage) formData.append("context_image", contextImage);

  const res = await fetch(`${API_BASE}/api/generate-outreach`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }

  return res.json();
}

export async function extractTextFromImage(
  image: File,
  activeProvider: string,
  activeModel: string,
  apiKey: string,
): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("active_provider", activeProvider);
  formData.append("active_model", activeModel);
  formData.append("api_key", apiKey);
  const res = await fetch(`${API_BASE}/api/extract-text-from-image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function getPreferences(): Promise<Preferences> {
  const res = await fetch(`${API_BASE}/api/preferences`);
  if (!res.ok) throw new Error("Failed to load preferences");
  return res.json();
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await fetch(`${API_BASE}/api/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
}

async function _triggerDownload(res: Response, filename: string): Promise<void> {
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadResume(resumeData: ResumeData): Promise<void> {
  const res = await fetch(`${API_BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume: resumeData }),
  });
  await _triggerDownload(res, "tailored_resume.docx");
}

export async function downloadResumePdf(resumeData: ResumeData): Promise<void> {
  const res = await fetch(`${API_BASE}/api/download-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume: resumeData }),
  });
  await _triggerDownload(res, "tailored_resume.pdf");
}
