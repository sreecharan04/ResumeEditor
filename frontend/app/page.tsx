"use client";

import { useEffect, useRef, useState } from "react";
import InputPanel from "@/components/InputPanel";
import ResumeEditor from "@/components/ResumeEditor";
import ResearchSummary from "@/components/ResearchSummary";
import ResumeDiff from "@/components/ResumeDiff";
import OutreachPanel from "@/components/OutreachPanel";
import SettingsPanel from "@/components/SettingsPanel";
import { editResume, downloadResume, downloadResumePdf, getPreferences, savePreferences, extractTextFromImage } from "@/lib/api";
import { Preferences, ResumeData, ResearchResult } from "@/lib/types";

const LOADING_MESSAGES = [
  "Parsing your resume...",
  "Analyzing the job description...",
  "Researching required skills and keywords...",
  "Tailoring your resume to the role...",
  "Finalizing edits...",
];

const DEFAULT_LINKEDIN_TEMPLATE =
  `Hi [Recruiter Name], I saw the [Job Title] at [Company] and wanted to connect. [1 sentence about your most relevant experience]. Would love to learn more!`;

const DEFAULT_EMAIL_TEMPLATE =
  `Hi [Recruiter Name],

I saw the [Job Title] role at [Company] and wanted to reach out as my background aligns closely with the work your team is doing.

[2-3 sentences highlighting your most relevant experience — be specific with company names, exact technologies, and real metrics from your resume that map directly to this role's requirements.]

I would appreciate the opportunity to connect and would be grateful if you could please review my attached resume.

Thank you,
[Your Name]`;

type Tab = "resume" | "outreach" | "settings";

export default function Home() {
  // Shared inputs
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");

  // All persisted preferences — loaded from backend on mount
  const [personalRules, setPersonalRules] = useState("");
  const [linkedinTemplate, setLinkedinTemplate] = useState(DEFAULT_LINKEDIN_TEMPLATE);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [outreachNotes, setOutreachNotes] = useState("");
  // LLM settings
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [activeModel, setActiveModel] = useState("gemini-2.0-flash");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [cerebrasKey, setCerebrasKey] = useState("");

  // Resume tab state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [originalResume, setOriginalResume] = useState<ResumeData | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [changesSummary, setChangesSummary] = useState("");
  const [isDownloading, setIsDownloading] = useState<"docx" | "pdf" | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("resume");

  // Ref always holds the latest prefs so the debounced save never captures stale values
  const prefsRef = useRef<Preferences>({
    personal_rules: "",
    linkedin_template: DEFAULT_LINKEDIN_TEMPLATE,
    email_template: DEFAULT_EMAIL_TEMPLATE,
    outreach_personal_notes: "",
    active_provider: "gemini",
    active_model: "gemini-2.0-flash",
    gemini_key: "",
    openai_key: "",
    anthropic_key: "",
    cerebras_key: "",
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LS_KEY = "resume_editor_prefs";

  const applyPrefs = (p: Partial<Preferences>) => {
    if (p.personal_rules !== undefined) setPersonalRules(p.personal_rules);
    if (p.linkedin_template) setLinkedinTemplate(p.linkedin_template);
    if (p.email_template) setEmailTemplate(p.email_template);
    if (p.outreach_personal_notes !== undefined) setOutreachNotes(p.outreach_personal_notes);
    if (p.active_provider) setActiveProvider(p.active_provider);
    if (p.active_model) setActiveModel(p.active_model);
    if (p.gemini_key !== undefined) setGeminiKey(p.gemini_key);
    if (p.openai_key !== undefined) setOpenaiKey(p.openai_key);
    if (p.anthropic_key !== undefined) setAnthropicKey(p.anthropic_key);
    if (p.cerebras_key !== undefined) setCerebrasKey(p.cerebras_key);
    prefsRef.current = {
      personal_rules: p.personal_rules ?? prefsRef.current.personal_rules,
      linkedin_template: p.linkedin_template || prefsRef.current.linkedin_template,
      email_template: p.email_template || prefsRef.current.email_template,
      outreach_personal_notes: p.outreach_personal_notes ?? prefsRef.current.outreach_personal_notes,
      active_provider: p.active_provider || prefsRef.current.active_provider,
      active_model: p.active_model || prefsRef.current.active_model,
      gemini_key: p.gemini_key ?? prefsRef.current.gemini_key,
      openai_key: p.openai_key ?? prefsRef.current.openai_key,
      anthropic_key: p.anthropic_key ?? prefsRef.current.anthropic_key,
      cerebras_key: p.cerebras_key ?? prefsRef.current.cerebras_key,
    };
  };

  // Load preferences on mount: backend first, localStorage as fallback
  useEffect(() => {
    const fromLocal = localStorage.getItem(LS_KEY);
    if (fromLocal) {
      try { applyPrefs(JSON.parse(fromLocal)); } catch {}
    }
    getPreferences()
      .then((p) => {
        applyPrefs(p);
        localStorage.setItem(LS_KEY, JSON.stringify(prefsRef.current));
      })
      .catch(() => {/* backend not running — localStorage already loaded above */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = () => {
    // Always persist to localStorage immediately so nothing is lost if server goes down
    localStorage.setItem(LS_KEY, JSON.stringify(prefsRef.current));
    // Also save to backend file (debounced)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => savePreferences(prefsRef.current).catch(() => {}), 800);
  };

  const handleRulesChange = (v: string) => {
    setPersonalRules(v);
    prefsRef.current = { ...prefsRef.current, personal_rules: v };
    scheduleSave();
  };

  const handleLinkedinTemplateChange = (v: string) => {
    setLinkedinTemplate(v);
    prefsRef.current = { ...prefsRef.current, linkedin_template: v };
    scheduleSave();
  };

  const handleEmailTemplateChange = (v: string) => {
    setEmailTemplate(v);
    prefsRef.current = { ...prefsRef.current, email_template: v };
    scheduleSave();
  };

  const handleOutreachNotesChange = (v: string) => {
    setOutreachNotes(v);
    prefsRef.current = { ...prefsRef.current, outreach_personal_notes: v };
    scheduleSave();
  };

  const handleActiveProviderChange = (v: string) => {
    setActiveProvider(v);
    prefsRef.current = { ...prefsRef.current, active_provider: v };
    scheduleSave();
  };
  const handleActiveModelChange = (v: string) => {
    setActiveModel(v);
    prefsRef.current = { ...prefsRef.current, active_model: v };
    scheduleSave();
  };
  const handleGeminiKeyChange = (v: string) => {
    setGeminiKey(v);
    prefsRef.current = { ...prefsRef.current, gemini_key: v };
    scheduleSave();
  };
  const handleOpenaiKeyChange = (v: string) => {
    setOpenaiKey(v);
    prefsRef.current = { ...prefsRef.current, openai_key: v };
    scheduleSave();
  };
  const handleAnthropicKeyChange = (v: string) => {
    setAnthropicKey(v);
    prefsRef.current = { ...prefsRef.current, anthropic_key: v };
    scheduleSave();
  };
  const handleCerebrasKeyChange = (v: string) => {
    setCerebrasKey(v);
    prefsRef.current = { ...prefsRef.current, cerebras_key: v };
    scheduleSave();
  };

  // Restore JD + file from sessionStorage on page reload
  useEffect(() => {
    const savedJd = sessionStorage.getItem("jd_text");
    if (savedJd) setJobDescription(savedJd);
    const b64 = sessionStorage.getItem("resume_file_b64");
    const name = sessionStorage.getItem("resume_file_name");
    const type = sessionStorage.getItem("resume_file_type") || "";
    if (b64 && name) {
      try {
        const data = b64.split(",")[1];
        const bytes = atob(data);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        setResumeFile(new File([arr], name, { type }));
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (file: File | null) => {
    setResumeFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          sessionStorage.setItem("resume_file_b64", e.target?.result as string);
          sessionStorage.setItem("resume_file_name", file.name);
          sessionStorage.setItem("resume_file_type", file.type);
        } catch {}
      };
      reader.readAsDataURL(file);
    } else {
      sessionStorage.removeItem("resume_file_b64");
      sessionStorage.removeItem("resume_file_name");
      sessionStorage.removeItem("resume_file_type");
    }
  };

  const handleJdChange = (v: string) => {
    setJobDescription(v);
    sessionStorage.setItem("jd_text", v);
  };

  const handleJdImageExtract = async (file: File): Promise<void> => {
    const apiKey = activeProvider === "gemini" ? geminiKey
      : activeProvider === "openai" ? openaiKey
      : activeProvider === "cerebras" ? cerebrasKey
      : anthropicKey;
    const result = await extractTextFromImage(file, activeProvider, activeModel, apiKey);
    handleJdChange(result.text);
  };

  useEffect(() => {
    if (!isLoading) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 3500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const canSubmit = !!resumeFile && jobDescription.trim().length > 20 && !isLoading;

  const handleEditResume = async () => {
    if (!canSubmit || !resumeFile) return;
    setIsLoading(true);
    setError(null);
    setLoadingMsg(LOADING_MESSAGES[0]);
    const apiKey = activeProvider === "gemini" ? geminiKey
      : activeProvider === "openai" ? openaiKey
      : activeProvider === "cerebras" ? cerebrasKey
      : anthropicKey;
    try {
      const result = await editResume(resumeFile, jobDescription, personalRules, activeProvider, activeModel, apiKey);
      setResearch(result.research);
      setOriginalResume(result.original_resume);
      setResumeData(result.resume);
      setChangesSummary(result.changes_summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: "docx" | "pdf") => {
    if (!resumeData) return;
    setIsDownloading(format);
    try {
      if (format === "pdf") await downloadResumePdf(resumeData);
      else await downloadResume(resumeData);
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-gray-900">Resume Editor</h1>
        </div>
        {resumeData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={isDownloading !== null}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
              </svg>
              {isDownloading === "pdf" ? "Generating..." : "Download PDF"}
            </button>
            <button
              onClick={() => handleDownload("docx")}
              disabled={isDownloading !== null}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60"
            >
              {isDownloading === "docx" ? "Downloading..." : "Download DOCX"}
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-80 shrink-0 border-r border-gray-200 bg-white p-5 flex flex-col overflow-y-auto">
          <InputPanel
            resumeFile={resumeFile}
            jobDescription={jobDescription}
            onFileChange={handleFileChange}
            onJdChange={handleJdChange}
            onJdImageExtract={handleJdImageExtract}
          />
        </aside>

        {/* Right Panel */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Tabs — always visible */}
          <div className="bg-gray-50 border-b border-gray-200 px-8 pt-4 shrink-0">
            <div className="flex gap-1 max-w-3xl mx-auto">
              <button
                onClick={() => setActiveTab("resume")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                  activeTab === "resume"
                    ? "bg-white border-gray-200 text-indigo-600"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
                </svg>
                Resume Editor
                {isLoading && activeTab !== "resume" && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("outreach")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                  activeTab === "outreach"
                    ? "bg-white border-gray-200 text-indigo-600"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Outreach
                {outreachLoading && activeTab !== "outreach" && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                  activeTab === "settings"
                    ? "bg-white border-gray-200 text-indigo-600"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {/* Resume Tab */}
            <div className={activeTab !== "resume" ? "hidden" : ""}>
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      My Rules
                      <span className="ml-2 font-normal normal-case text-gray-400">(auto-saved)</span>
                    </label>
                    <textarea
                      value={personalRules}
                      onChange={(e) => handleRulesChange(e.target.value)}
                      rows={4}
                      placeholder={`Example rules:\n- Keep resume to 1 page\n- Always quantify achievements\n- Use past tense for old jobs`}
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleEditResume}
                    disabled={!canSubmit}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      canSubmit
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-sm"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </>
                    ) : resumeData ? "Regenerate Resume" : "Edit Resume"}
                  </button>
                </div>

                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-6">
                    <div className="relative w-14 h-14">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">{loadingMsg}</p>
                      <p className="text-xs text-gray-400 mt-1">This takes 20–40 seconds</p>
                    </div>
                    <div className="flex gap-2">
                      {LOADING_MESSAGES.map((msg, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
                          msg === loadingMsg ? "w-6 bg-indigo-600" : "w-1.5 bg-gray-200"
                        }`} />
                      ))}
                    </div>
                  </div>
                )}

                {!isLoading && !resumeData && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Your tailored resume will appear here</p>
                      <p className="text-xs text-gray-400 mt-1">Add your rules above and click Edit Resume</p>
                    </div>
                  </div>
                )}

                {!isLoading && resumeData && (
                  <>
                    {research && <ResearchSummary research={research} changesSummary={changesSummary} />}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                      <ResumeEditor resume={resumeData} onChange={setResumeData} />
                    </div>
                    {originalResume && <ResumeDiff original={originalResume} edited={resumeData} />}
                  </>
                )}
              </div>
            </div>

            {/* Outreach Tab */}
            <div className={activeTab !== "outreach" ? "hidden" : ""}>
              <OutreachPanel
                resumeFile={resumeFile}
                jobDescription={jobDescription}
                linkedinTemplate={linkedinTemplate}
                emailTemplate={emailTemplate}
                personalNotes={outreachNotes}
                activeProvider={activeProvider}
                activeModel={activeModel}
                apiKey={activeProvider === "gemini" ? geminiKey : activeProvider === "openai" ? openaiKey : activeProvider === "cerebras" ? cerebrasKey : anthropicKey}
                onLinkedinTemplateChange={handleLinkedinTemplateChange}
                onEmailTemplateChange={handleEmailTemplateChange}
                onPersonalNotesChange={handleOutreachNotesChange}
                onLoadingChange={setOutreachLoading}
              />
            </div>

            {/* Settings Tab */}
            <div className={activeTab !== "settings" ? "hidden" : ""}>
              <SettingsPanel
                activeProvider={activeProvider}
                activeModel={activeModel}
                geminiKey={geminiKey}
                openaiKey={openaiKey}
                anthropicKey={anthropicKey}
                cerebrasKey={cerebrasKey}
                onActiveProviderChange={handleActiveProviderChange}
                onActiveModelChange={handleActiveModelChange}
                onGeminiKeyChange={handleGeminiKeyChange}
                onOpenaiKeyChange={handleOpenaiKeyChange}
                onAnthropicKeyChange={handleAnthropicKeyChange}
                onCerebrasKeyChange={handleCerebrasKeyChange}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
