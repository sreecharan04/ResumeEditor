"use client";

import { useState } from "react";
import { ResumeData, ExperienceEntry, SkillSection } from "@/lib/types";

// ─── Word-level diff ──────────────────────────────────────────────────────────

type DiffWord = { text: string; type: "same" | "removed" | "added" };

function wordDiff(original: string, edited: string): DiffWord[] {
  const a = original.split(/(\s+)/);
  const b = edited.split(/(\s+)/);

  // Simple LCS-based word diff
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const result: DiffWord[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      result.push({ text: a[i], type: "same" });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ text: b[j], type: "added" });
      j++;
    } else {
      result.push({ text: a[i], type: "removed" });
      i++;
    }
  }
  return result;
}

function DiffLine({ original, edited }: { original: string; edited: string }) {
  if (original === edited) return null;
  const words = wordDiff(original, edited);
  return (
    <div className="text-xs leading-relaxed py-0.5">
      {words.map((w, i) => (
        <span
          key={i}
          className={
            w.type === "removed"
              ? "bg-red-100 text-red-700 line-through mx-[1px]"
              : w.type === "added"
              ? "bg-green-100 text-green-700 font-medium mx-[1px]"
              : "text-gray-600"
          }
        >
          {w.text}
        </span>
      ))}
    </div>
  );
}

// ─── Section diffing helpers ──────────────────────────────────────────────────

function BulletDiffs({
  origBullets,
  editBullets,
}: {
  origBullets: string[];
  editBullets: string[];
}) {
  const maxLen = Math.max(origBullets.length, editBullets.length);
  const rows = Array.from({ length: maxLen }, (_, i) => ({
    orig: origBullets[i] ?? null,
    edit: editBullets[i] ?? null,
  }));

  const hasChanges = rows.some(
    ({ orig, edit }) => orig !== edit
  );
  if (!hasChanges) return null;

  return (
    <div className="space-y-1 mt-1 ml-3">
      {rows.map(({ orig, edit }, i) => {
        if (orig === null)
          return (
            <div key={i} className="text-xs bg-green-50 border-l-2 border-green-400 pl-2 py-0.5 text-green-700">
              + {edit}
            </div>
          );
        if (edit === null)
          return (
            <div key={i} className="text-xs bg-red-50 border-l-2 border-red-400 pl-2 py-0.5 text-red-600 line-through">
              {orig}
            </div>
          );
        if (orig === edit) return null;
        return (
          <div key={i} className="border-l-2 border-amber-400 pl-2 py-0.5">
            <DiffLine original={orig} edited={edit} />
          </div>
        );
      })}
    </div>
  );
}

function ExperienceDiff({
  original,
  edited,
}: {
  original: ExperienceEntry[];
  edited: ExperienceEntry[];
}) {
  const pairs = original.map((orig) => ({
    orig,
    edit: edited.find((e) => e.id === orig.id),
  }));

  const hasDiffs = pairs.some(
    ({ orig, edit }) =>
      edit &&
      (orig.company !== edit.company ||
        orig.title !== edit.title ||
        JSON.stringify(orig.bullets) !== JSON.stringify(edit.bullets))
  );

  if (!hasDiffs) return <p className="text-xs text-gray-400 italic">No changes</p>;

  return (
    <div className="space-y-3">
      {pairs.map(({ orig, edit }) => {
        if (!edit) return null;
        const bulletChanged = JSON.stringify(orig.bullets) !== JSON.stringify(edit.bullets);
        if (!bulletChanged) return null;
        return (
          <div key={orig.id}>
            <p className="text-xs font-semibold text-gray-700">
              {orig.company} — {orig.title}
            </p>
            <BulletDiffs origBullets={orig.bullets} editBullets={edit.bullets} />
          </div>
        );
      })}
    </div>
  );
}

function SkillsDiff({
  original,
  edited,
}: {
  original: SkillSection[];
  edited: SkillSection[];
}) {
  const rows = original.map((orig) => {
    const edit = edited.find((e) => e.category === orig.category);
    return { orig, edit };
  });

  const hasDiffs = rows.some(
    ({ orig, edit }) => edit && JSON.stringify(orig.items) !== JSON.stringify(edit.items)
  );

  if (!hasDiffs) return <p className="text-xs text-gray-400 italic">No changes</p>;

  return (
    <div className="space-y-2">
      {rows.map(({ orig, edit }) => {
        if (!edit || JSON.stringify(orig.items) === JSON.stringify(edit.items)) return null;
        const removedItems = orig.items.filter((i) => !edit.items.includes(i));
        const addedItems = edit.items.filter((i) => !orig.items.includes(i));
        return (
          <div key={orig.category}>
            <p className="text-xs font-semibold text-gray-700 mb-1">{orig.category}</p>
            <div className="text-xs flex flex-wrap gap-1">
              {edit.items.map((item) => {
                const isNew = addedItems.includes(item);
                const wasFirst = orig.items[0] !== edit.items[0] && item === edit.items[0];
                return (
                  <span
                    key={item}
                    className={
                      isNew
                        ? "bg-green-100 text-green-700 px-1.5 py-0.5 rounded"
                        : wasFirst && !isNew
                        ? "bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium"
                        : "bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                    }
                  >
                    {item}
                    {wasFirst && !isNew ? " ↑" : ""}
                  </span>
                );
              })}
              {removedItems.map((item) => (
                <span key={item} className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded line-through">
                  {item}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ResumeDiffProps {
  original: ResumeData;
  edited: ResumeData;
}

export default function ResumeDiff({ original, edited }: ResumeDiffProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-amber-200 rounded-lg bg-amber-50/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            What Changed
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            diff vs your original
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-amber-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-amber-200">
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-green-200" /> Added / reworded to
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-200" /> Removed / reworded from
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-amber-200" /> Reordered
            </span>
          </div>

          {/* Experience */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Experience Bullets</p>
            <ExperienceDiff original={original.experience} edited={edited.experience} />
          </div>

          {/* Skills */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
            <SkillsDiff original={original.skills} edited={edited.skills} />
          </div>
        </div>
      )}
    </div>
  );
}
