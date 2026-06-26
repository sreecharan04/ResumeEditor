"use client";

import { useEffect, useRef } from "react";
import {
  ResumeData,
  ExperienceEntry,
  EducationEntry,
  SkillSection,
  ProjectEntry,
} from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0">{title}</h2>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        if (ref.current) {
          ref.current.style.height = "auto";
          ref.current.style.height = ref.current.scrollHeight + "px";
        }
      }}
      rows={1}
      className={`block w-full min-w-0 resize-none overflow-hidden bg-transparent border border-transparent rounded px-2 py-1 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-300 focus:bg-white focus:ring-1 focus:ring-indigo-200 transition-all ${className}`}
    />
  );
}

// ─── Sub-sections ────────────────────────────────────────────────────────────

function ContactSection({
  resume,
  onChange,
}: {
  resume: ResumeData;
  onChange: (r: ResumeData) => void;
}) {
  const set = (field: string, value: string) =>
    onChange({ ...resume, contact: { ...(resume.contact ?? {}), [field]: value } });

  const fields: { key: keyof typeof resume.contact; label: string; placeholder: string }[] = [
    { key: "email", label: "Email", placeholder: "email@example.com" },
    { key: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
    { key: "location", label: "Location", placeholder: "City, State" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/..." },
    { key: "github", label: "GitHub", placeholder: "github.com/..." },
    { key: "website", label: "Website", placeholder: "yoursite.com" },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} className="flex items-baseline gap-2 min-w-0">
          <span className="text-xs font-medium text-gray-400 w-16 shrink-0">{label}</span>
          <div className="flex-1 min-w-0">
            <AutoTextarea
              value={((resume.contact ?? {})[key] as string) || ""}
              onChange={(v) => set(key, v)}
              placeholder={placeholder}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BulletList({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  return (
    <div className="space-y-0.5 mt-1">
      {bullets.map((bullet, i) => (
        <div key={i} className="flex items-start gap-1 group min-w-0">
          <span className="mt-[7px] text-gray-400 text-xs select-none shrink-0">•</span>
          <div className="flex-1 min-w-0">
            <AutoTextarea
              value={bullet}
              onChange={(v) => {
                const next = [...bullets];
                next[i] = v;
                onChange(next);
              }}
            />
          </div>
          <button
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            className="mt-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-lg leading-none px-1 shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...bullets, ""])}
        className="ml-4 mt-1 text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
      >
        + Add bullet
      </button>
    </div>
  );
}

function ExperienceSection({
  experience,
  onChange,
}: {
  experience: ExperienceEntry[];
  onChange: (e: ExperienceEntry[]) => void;
}) {
  const update = (i: number, partial: Partial<ExperienceEntry>) => {
    const next = [...experience];
    next[i] = { ...next[i], ...partial };
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {experience.map((exp, i) => (
        <div key={exp.id} className="group/exp">
          <div className="flex items-start gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <AutoTextarea
                    value={exp.company}
                    onChange={(v) => update(i, { company: v })}
                    placeholder="Company"
                    className="font-semibold text-gray-900"
                  />
                </div>
                <div className="w-36 shrink-0">
                  <AutoTextarea
                    value={exp.dates}
                    onChange={(v) => update(i, { dates: v })}
                    placeholder="Jan 2022 – Present"
                    className="text-right text-gray-500 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <AutoTextarea
                    value={exp.title}
                    onChange={(v) => update(i, { title: v })}
                    placeholder="Job Title"
                    className="text-indigo-600 text-sm"
                  />
                </div>
                <div className="w-36 shrink-0">
                  <AutoTextarea
                    value={exp.location || ""}
                    onChange={(v) => update(i, { location: v })}
                    placeholder="Location"
                    className="text-right text-gray-400 text-xs"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => onChange(experience.filter((_, j) => j !== i))}
              className="opacity-0 group-hover/exp:opacity-100 mt-1 text-gray-300 hover:text-red-400 transition-all text-lg leading-none px-1 shrink-0"
            >
              ×
            </button>
          </div>
          <BulletList
            bullets={exp.bullets}
            onChange={(b) => update(i, { bullets: b })}
          />
        </div>
      ))}
    </div>
  );
}

function EducationSection({
  education,
  onChange,
}: {
  education: EducationEntry[];
  onChange: (e: EducationEntry[]) => void;
}) {
  const update = (i: number, partial: Partial<EducationEntry>) => {
    const next = [...education];
    next[i] = { ...next[i], ...partial };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {education.map((edu, i) => (
        <div key={edu.id} className="group/edu">
          <div className="flex items-start gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <AutoTextarea
                    value={edu.institution}
                    onChange={(v) => update(i, { institution: v })}
                    placeholder="University"
                    className="font-semibold text-gray-900"
                  />
                </div>
                <div className="w-36 shrink-0">
                  <AutoTextarea
                    value={edu.dates}
                    onChange={(v) => update(i, { dates: v })}
                    placeholder="2018 – 2022"
                    className="text-right text-gray-500 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <AutoTextarea
                    value={`${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`}
                    onChange={(v) => update(i, { degree: v, field: "" })}
                    placeholder="BS Computer Science"
                    className="text-sm text-gray-700"
                  />
                </div>
                <div className="w-36 shrink-0">
                  <AutoTextarea
                    value={edu.gpa || ""}
                    onChange={(v) => update(i, { gpa: v })}
                    placeholder="GPA: 3.9"
                    className="text-right text-gray-400 text-xs"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => onChange(education.filter((_, j) => j !== i))}
              className="opacity-0 group-hover/edu:opacity-100 mt-1 text-gray-300 hover:text-red-400 transition-all text-lg leading-none px-1 shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillsSection({
  skills,
  onChange,
}: {
  skills: SkillSection[];
  onChange: (s: SkillSection[]) => void;
}) {
  const update = (i: number, partial: Partial<SkillSection>) => {
    const next = [...skills];
    next[i] = { ...next[i], ...partial };
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {skills.map((section, i) => (
        <div key={i} className="flex items-start gap-1 group/skill min-w-0">
          <div className="w-36 shrink-0">
            <AutoTextarea
              value={section.category}
              onChange={(v) => update(i, { category: v })}
              placeholder="Category"
              className="font-semibold text-gray-700"
            />
          </div>
          <span className="text-gray-300 mt-[7px] shrink-0">:</span>
          <div className="flex-1 min-w-0">
            <AutoTextarea
              value={section.items.join(", ")}
              onChange={(v) =>
                update(i, { items: v.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="skill1, skill2, skill3"
            />
          </div>
          <button
            onClick={() => onChange(skills.filter((_, j) => j !== i))}
            className="opacity-0 group-hover/skill:opacity-100 mt-1 text-gray-300 hover:text-red-400 transition-all text-lg leading-none px-1 shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...skills, { category: "New Category", items: [] }])}
        className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
      >
        + Add skill category
      </button>
    </div>
  );
}

function ProjectsSection({
  projects,
  onChange,
}: {
  projects: ProjectEntry[];
  onChange: (p: ProjectEntry[]) => void;
}) {
  const update = (i: number, partial: Partial<ProjectEntry>) => {
    const next = [...projects];
    next[i] = { ...next[i], ...partial };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {projects.map((proj, i) => (
        <div key={proj.id} className="group/proj">
          <div className="flex items-start gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <AutoTextarea
                    value={proj.name}
                    onChange={(v) => update(i, { name: v })}
                    placeholder="Project Name"
                    className="font-semibold text-gray-900"
                  />
                </div>
                <div className="min-w-0 max-w-[200px]">
                  <AutoTextarea
                    value={proj.technologies || ""}
                    onChange={(v) => update(i, { technologies: v })}
                    placeholder="React, Node, PostgreSQL"
                    className="text-gray-400 text-xs text-right"
                  />
                </div>
              </div>
              <AutoTextarea
                value={proj.description}
                onChange={(v) => update(i, { description: v })}
                placeholder="Brief project description"
                className="text-sm text-gray-600"
              />
            </div>
            <button
              onClick={() => onChange(projects.filter((_, j) => j !== i))}
              className="opacity-0 group-hover/proj:opacity-100 mt-1 text-gray-300 hover:text-red-400 transition-all text-lg leading-none px-1 shrink-0"
            >
              ×
            </button>
          </div>
          <BulletList
            bullets={proj.bullets || []}
            onChange={(b) => update(i, { bullets: b })}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ResumeEditorProps {
  resume: ResumeData;
  onChange: (r: ResumeData) => void;
}

export default function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  return (
    <div className="space-y-6 font-sans">
      {/* Name */}
      <div className="text-center">
        <AutoTextarea
          value={resume.name}
          onChange={(v) => onChange({ ...resume, name: v })}
          placeholder="Your Name"
          className="text-2xl font-bold text-gray-900 text-center"
        />
      </div>

      {/* Contact */}
      <ContactSection resume={resume} onChange={onChange} />

      {/* Summary */}
      {resume.summary !== undefined && (
        <div>
          <SectionHeader title="Summary" />
          <AutoTextarea
            value={resume.summary || ""}
            onChange={(v) => onChange({ ...resume, summary: v })}
            placeholder="Professional summary..."
            className="text-sm text-gray-700 leading-relaxed"
          />
        </div>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <div>
          <SectionHeader title="Experience" />
          <ExperienceSection
            experience={resume.experience}
            onChange={(e) => onChange({ ...resume, experience: e })}
          />
        </div>
      )}

      {/* Education */}
      {resume.education?.length > 0 && (
        <div>
          <SectionHeader title="Education" />
          <EducationSection
            education={resume.education}
            onChange={(e) => onChange({ ...resume, education: e })}
          />
        </div>
      )}

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <div>
          <SectionHeader title="Skills" />
          <SkillsSection
            skills={resume.skills}
            onChange={(s) => onChange({ ...resume, skills: s })}
          />
        </div>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <div>
          <SectionHeader title="Projects" />
          <ProjectsSection
            projects={resume.projects}
            onChange={(p) => onChange({ ...resume, projects: p })}
          />
        </div>
      )}
    </div>
  );
}
