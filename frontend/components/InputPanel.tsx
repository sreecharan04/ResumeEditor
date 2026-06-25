"use client";

import { useRef, useState } from "react";

interface InputPanelProps {
  resumeFile: File | null;
  jobDescription: string;
  onFileChange: (file: File | null) => void;
  onJdChange: (jd: string) => void;
  onJdImageExtract?: (file: File) => Promise<void>;
}

export default function InputPanel({
  resumeFile,
  jobDescription,
  onFileChange,
  onJdChange,
  onJdImageExtract,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [jdImage, setJdImage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }
    onFileChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleJdImage = async (file: File) => {
    setJdImage(URL.createObjectURL(file));
    setExtractError(null);
    if (!onJdImageExtract) return;
    setExtracting(true);
    try {
      await onJdImageExtract(file);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleJdPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleJdImage(file);
        return;
      }
    }
  };

  const clearJdImage = () => {
    setJdImage(null);
    setExtractError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Resume upload */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Resume
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`
            relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
            cursor-pointer transition-all p-6 text-center
            ${isDragOver
              ? "border-indigo-400 bg-indigo-50"
              : resumeFile
                ? "border-green-400 bg-green-50"
                : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-gray-50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {resumeFile ? (
            <>
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-green-700">{resumeFile.name}</p>
              <p className="text-xs text-green-500">Click to replace</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600">
                Drop your resume or <span className="text-indigo-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-gray-400">PDF or DOCX</p>
            </>
          )}
        </div>
      </div>

      {/* Job Description */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Job Description
          </label>
          {onJdImageExtract && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              title="Upload or paste a JD screenshot — text will be extracted automatically"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Paste / upload image
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJdImage(f); }}
          />
        </div>

        {/* JD image preview */}
        {jdImage && (
          <div className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 flex items-start gap-2">
            <img src={jdImage} alt="JD screenshot" className="w-16 h-16 object-cover rounded flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {extracting ? (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Extracting text…
                </div>
              ) : extractError ? (
                <p className="text-xs text-red-600">{extractError}</p>
              ) : (
                <p className="text-xs text-indigo-700 font-medium">Text extracted — see JD box below</p>
              )}
            </div>
            <button onClick={clearJdImage} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Remove image">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <textarea
          value={jobDescription}
          onChange={(e) => onJdChange(e.target.value)}
          onPaste={handleJdPaste}
          placeholder={extracting ? "Extracting text from image…" : "Paste the job description here, or paste/upload a screenshot above…"}
          disabled={extracting}
          className="flex-1 min-h-[200px] w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-60"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {jobDescription.length} chars
          {!jdImage && <span className="ml-2 text-gray-300">· Cmd+V image to extract text</span>}
        </p>
      </div>
    </div>
  );
}
