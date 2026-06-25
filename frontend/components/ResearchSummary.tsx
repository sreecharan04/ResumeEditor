"use client";

import { useState } from "react";
import { ResearchResult } from "@/lib/types";

interface ResearchSummaryProps {
  research: ResearchResult;
  changesSummary: string;
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`inline-block rounded px-2 py-0.5 text-xs ${color}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function ResearchSummary({ research, changesSummary }: ResearchSummaryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-indigo-100 rounded-lg bg-indigo-50/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
            Research Findings
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {research.role_title} · {research.role_level}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-indigo-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-indigo-100">
          <p className="text-sm text-gray-600 mt-3 italic">{research.role_summary}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Tools in JD</p>
              <TagList
                items={research.tools_explicitly_mentioned || []}
                color="bg-red-100 text-red-700"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Implied by role</p>
              <TagList
                items={research.tools_implied_by_context || []}
                color="bg-blue-100 text-blue-700"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">ATS Keywords to include</p>
            <TagList
              items={research.keywords_for_ats || []}
              color="bg-green-100 text-green-700"
            />
          </div>

          {research.role_level_signals && (
            <div className="text-xs text-gray-500 bg-white rounded border border-indigo-100 px-3 py-2">
              <span className="font-semibold">Seniority: </span>{research.role_level_signals}
            </div>
          )}

          {changesSummary && (
            <div className="bg-white rounded-md border border-indigo-100 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">What was changed</p>
              <p className="text-xs text-gray-600">{changesSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
