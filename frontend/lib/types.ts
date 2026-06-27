export interface Contact {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  location?: string | null;
  dates: string;
  bullets: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field?: string | null;
  dates: string;
  gpa?: string | null;
  details?: string[];
}

export interface SkillSection {
  category: string;
  items: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies?: string | null;
  bullets?: string[];
}

export interface ResumeData {
  name: string;
  contact: Contact;
  summary?: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillSection[];
  projects?: ProjectEntry[];
}

export interface ResearchResult {
  role_title: string;
  role_level: string;
  tools_explicitly_mentioned: string[];
  tools_implied_by_context: string[];
  keywords_for_ats: string[];
  what_to_emphasize: string[];
  role_summary: string;
  role_level_signals: string;
}

export interface EditResumeResponse {
  research: ResearchResult;
  original_resume: ResumeData;
  resume: ResumeData;
  changes_summary: string;
}

export interface OutreachResult {
  linkedin_note?: string;
  email?: string;
  company: string;
  role_title: string;
}

export interface Preferences {
  personal_rules: string;
  linkedin_template: string;
  email_template: string;
  outreach_personal_notes: string;
  active_provider: string;
  active_model: string;
  gemini_key: string;
  openai_key: string;
  anthropic_key: string;
  cerebras_key: string;
}
