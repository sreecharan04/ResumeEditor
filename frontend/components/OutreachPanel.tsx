"use client";

import { useRef, useState } from "react";
import { OutreachResult } from "@/lib/types";
import { generateOutreach } from "@/lib/api";

const LINKEDIN_LIMIT = 300;

interface Props {
  resumeFile: File | null;
  jobDescription: string;
  linkedinTemplate: string;
  emailTemplate: string;
  personalNotes: string;
  activeProvider: string;
  activeModel: string;
  apiKey: string;
  onLinkedinTemplateChange: (v: string) => void;
  onEmailTemplateChange: (v: string) => void;
  onPersonalNotesChange: (v: string) => void;
  onLoadingChange?: (v: boolean) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-indigo-50"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function RegenButton({ onClick, loading, label = "Regenerate" }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={label}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-40"
    >
      <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {loading ? "Generating…" : label}
    </button>
  );
}

export default function OutreachPanel({
  resumeFile,
  jobDescription,
  linkedinTemplate,
  emailTemplate,
  personalNotes,
  activeProvider,
  activeModel,
  apiKey,
  onLinkedinTemplateChange,
  onEmailTemplateChange,
  onPersonalNotesChange,
  onLoadingChange,
}: Props) {
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);
  const [linkedinNote, setLinkedinNote] = useState("");
  const [email, setEmail] = useState("");
  // "both" | "linkedin" | "email" | null — tracks what's currently generating
  const [generatingTarget, setGeneratingTarget] = useState<"both" | "linkedin" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Context image for outreach (LinkedIn post screenshot, etc.)
  const [contextImage, setContextImage] = useState<File | null>(null);
  const [contextImagePreview, setContextImagePreview] = useState<string | null>(null);
  const contextImageInputRef = useRef<HTMLInputElement>(null);

  const canGenerate = !!resumeFile && jobDescription.trim().length > 20;
  const anyLoading = generatingTarget !== null;

  const handleGenerate = async (target: "both" | "linkedin" | "email" = "both") => {
    if (!canGenerate || !resumeFile) return;
    setGeneratingTarget(target);
    if (target === "both") onLoadingChange?.(true);
    setError(null);
    try {
      const result = await generateOutreach(
        resumeFile,
        jobDescription,
        linkedinTemplate,
        emailTemplate,
        personalNotes,
        activeProvider,
        activeModel,
        apiKey,
        target,
        contextImage ?? undefined,
      );
      setLinkedinNote(prev => result.linkedin_note ?? prev);
      setEmail(prev => result.email ?? prev);
      if (target === "both" || outreach === null) setOutreach(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed. Check the backend is running.");
    } finally {
      setGeneratingTarget(null);
      if (target === "both") onLoadingChange?.(false);
    }
  };

  const handleContextImage = (file: File) => {
    setContextImage(file);
    setContextImagePreview(URL.createObjectURL(file));
  };

  // Fires on any paste within the outreach section — captures images from any focused element
  const handleAnyPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) handleContextImage(file);
        return;
      }
    }
  };

  const clearContextImage = () => {
    setContextImage(null);
    setContextImagePreview(null);
    if (contextImageInputRef.current) contextImageInputRef.current.value = "";
  };

  const linkedinCount = linkedinNote.length;
  const linkedinOver = linkedinCount > LINKEDIN_LIMIT;

  return (
    <div className="max-w-3xl mx-auto space-y-5" onPaste={handleAnyPaste}>
      {/* ── Templates & Config ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-800">Templates & Instructions</h2>

        {/* LinkedIn Template */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            LinkedIn Note Template
            <span className="ml-2 normal-case font-normal text-gray-400">— AI fills in [placeholders]</span>
          </label>
          <textarea
            value={linkedinTemplate}
            onChange={(e) => onLinkedinTemplateChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition font-mono"
          />
        </div>

        {/* Email Template */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Email Template
            <span className="ml-2 normal-case font-normal text-gray-400">— AI fills in [placeholders]</span>
          </label>
          <textarea
            value={emailTemplate}
            onChange={(e) => onEmailTemplateChange(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition font-mono"
          />
        </div>

        {/* Personal Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Personal Notes
            <span className="ml-2 normal-case font-normal text-gray-400">(saved automatically)</span>
          </label>
          <textarea
            value={personalNotes}
            onChange={(e) => onPersonalNotesChange(e.target.value)}
            rows={3}
            placeholder="e.g. Mention I'm open to relocation. Emphasize my Python background. Keep it casual."
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
          />
        </div>

        {/* Context Image */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Context Image
              <span className="ml-2 normal-case font-normal text-gray-400">(optional — LinkedIn post, job ad screenshot)</span>
            </label>
          </div>

          {contextImagePreview ? (
            <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <img src={contextImagePreview} alt="Context" className="w-20 h-20 object-cover rounded flex-shrink-0 border border-indigo-200" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-indigo-700 mb-1">Image attached — AI will use it as context</p>
                <p className="text-xs text-indigo-500">The AI will read any relevant details from this image when generating outreach</p>
              </div>
              <button onClick={clearContextImage} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Remove image">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-5 text-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => contextImageInputRef.current?.click()}
                    className="text-indigo-600 font-semibold hover:text-indigo-800 transition"
                  >
                    Click to upload
                  </button>
                  {" "}or press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono border border-gray-200">⌘V</kbd> anywhere in this section to paste
                </p>
              </div>
            </div>
          )}
          <input
            ref={contextImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleContextImage(f); }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!resumeFile && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Upload a resume in the left panel to enable generation.
          </p>
        )}

        {/* Main generate button */}
        <button
          onClick={() => handleGenerate("both")}
          disabled={!canGenerate || anyLoading}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            canGenerate && !anyLoading
              ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {generatingTarget === "both" ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : outreach ? "Regenerate Both" : "Generate Outreach"}
        </button>
      </div>

      {/* ── Loading state (both) ── */}
      {generatingTarget === "both" && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500">Drafting your outreach messages…</p>
        </div>
      )}

      {/* ── Results ── */}
      {outreach && generatingTarget !== "both" && (
        <>
          {/* Context badge */}
          {(outreach.company || outreach.role_title) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium text-xs">
                {outreach.role_title}
              </span>
              {outreach.company && (
                <>
                  <span className="text-gray-300 text-xs">at</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium text-xs">
                    {outreach.company}
                  </span>
                </>
              )}
            </div>
          )}

          {/* LinkedIn Note */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">LinkedIn Connection Note</h3>
              </div>
              <div className="flex items-center gap-1">
                <RegenButton
                  onClick={() => handleGenerate("linkedin")}
                  loading={generatingTarget === "linkedin"}
                  label="Regenerate note"
                />
                <CopyButton text={linkedinNote} />
              </div>
            </div>

            {generatingTarget === "linkedin" ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-indigo-600">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerating LinkedIn note…
              </div>
            ) : (
              <textarea
                value={linkedinNote}
                onChange={(e) => setLinkedinNote(e.target.value)}
                rows={4}
                className={`w-full rounded-lg border p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 transition ${
                  linkedinOver
                    ? "border-red-300 bg-red-50 focus:ring-red-300"
                    : "border-gray-200 bg-white focus:ring-indigo-300 focus:border-transparent"
                }`}
              />
            )}

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">LinkedIn notes are limited to {LINKEDIN_LIMIT} characters</p>
              <span className={`text-xs font-semibold tabular-nums ${
                linkedinOver ? "text-red-500" : linkedinCount > 270 ? "text-amber-500" : "text-gray-400"
              }`}>
                {linkedinCount} / {LINKEDIN_LIMIT}
              </span>
            </div>
            {linkedinOver && (
              <p className="mt-1 text-xs text-red-500 font-medium">Over limit by {linkedinCount - LINKEDIN_LIMIT} characters</p>
            )}
          </div>

          {/* Email */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Cold Outreach Email</h3>
              </div>
              <div className="flex items-center gap-1">
                <RegenButton
                  onClick={() => handleGenerate("email")}
                  loading={generatingTarget === "email"}
                  label="Regenerate email"
                />
                <CopyButton text={email} />
              </div>
            </div>

            {generatingTarget === "email" ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-indigo-600">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerating email…
              </div>
            ) : (
              <textarea
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                rows={14}
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition font-mono"
              />
            )}
            <p className="text-xs text-gray-400 mt-2">
              Replace <span className="font-medium text-gray-500">[Recruiter Name]</span> before sending
            </p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!outreach && !anyLoading && canGenerate && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center text-gray-400">
          <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Edit the templates above and click Generate Outreach</p>
        </div>
      )}
    </div>
  );
}
