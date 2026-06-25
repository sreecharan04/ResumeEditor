"use client";

import { useState } from "react";

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", color: "text-blue-600" },
  { id: "openai", label: "OpenAI", color: "text-green-600" },
  { id: "anthropic", label: "Anthropic", color: "text-orange-600" },
] as const;

const MODELS: Record<string, string[]> = {
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"],
  anthropic: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
};

type Provider = "gemini" | "openai" | "anthropic";

interface Props {
  activeProvider: string;
  activeModel: string;
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
  onActiveProviderChange: (v: string) => void;
  onActiveModelChange: (v: string) => void;
  onGeminiKeyChange: (v: string) => void;
  onOpenaiKeyChange: (v: string) => void;
  onAnthropicKeyChange: (v: string) => void;
}

function KeyInput({
  label,
  provider,
  value,
  onChange,
  isActive,
}: {
  label: string;
  provider: string;
  value: string;
  onChange: (v: string) => void;
  isActive: boolean;
}) {
  const [show, setShow] = useState(false);
  const isSet = value.length > 0;

  return (
    <div className={`rounded-lg border p-4 transition-colors ${isActive ? "border-indigo-200 bg-indigo-50/40" : "border-gray-100 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {isActive && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full uppercase tracking-wide">
              Active
            </span>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium ${isSet ? "text-green-600" : "text-gray-400"}`}>
          {isSet ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Key set
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              Not set
            </>
          )}
        </span>
      </div>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Paste your ${label} API key...`}
          className="w-full pr-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition font-mono"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          tabIndex={-1}
          type="button"
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPanel({
  activeProvider,
  activeModel,
  geminiKey,
  openaiKey,
  anthropicKey,
  onActiveProviderChange,
  onActiveModelChange,
  onGeminiKeyChange,
  onOpenaiKeyChange,
  onAnthropicKeyChange,
}: Props) {
  const provider = activeProvider as Provider;
  const modelOptions = MODELS[provider] ?? [];
  const isCustomModel = activeModel && !modelOptions.includes(activeModel);

  const handleProviderChange = (p: string) => {
    onActiveProviderChange(p);
    // suggest a default model when switching providers
    const defaults: Record<string, string> = {
      gemini: "gemini-2.0-flash",
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-6",
    };
    onActiveModelChange(defaults[p] ?? "");
  };

  const keyChangeMap: Record<string, (v: string) => void> = {
    gemini: onGeminiKeyChange,
    openai: onOpenaiKeyChange,
    anthropic: onAnthropicKeyChange,
  };
  const keyValueMap: Record<string, string> = {
    gemini: geminiKey,
    openai: openaiKey,
    anthropic: anthropicKey,
  };
  const keyLabelMap: Record<string, string> = {
    gemini: "Google Gemini",
    openai: "OpenAI",
    anthropic: "Anthropic",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Active Provider + Model */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Active Provider</h2>
          <p className="text-xs text-gray-400 mt-0.5">All resume and outreach generation will use this provider</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${
                activeProvider === p.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <span className={`text-xs font-semibold ${activeProvider === p.id ? "text-indigo-600" : "text-gray-400"}`}>
                {p.id === "gemini" ? "Gemini" : p.id === "openai" ? "OpenAI" : "Anthropic"}
              </span>
              <span className="text-[11px] text-gray-400 font-normal">{p.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Model
          </label>
          <select
            value={isCustomModel ? "__custom__" : (activeModel || modelOptions[0] || "")}
            onChange={(e) => {
              if (e.target.value !== "__custom__") onActiveModelChange(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value="__custom__">Custom model name...</option>
          </select>
          {isCustomModel && (
            <input
              type="text"
              value={activeModel}
              onChange={(e) => onActiveModelChange(e.target.value)}
              placeholder="Enter exact model name..."
              className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition font-mono"
            />
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            Current: <span className="font-mono text-gray-600">{activeModel || modelOptions[0] || "—"}</span>
          </p>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">API Keys</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Keys are saved locally to your machine only — never sent anywhere except directly to the provider.
          </p>
        </div>

        {(["gemini", "openai", "anthropic"] as Provider[]).map((p) => (
          <KeyInput
            key={p}
            label={keyLabelMap[p]}
            provider={p}
            value={keyValueMap[p]}
            onChange={keyChangeMap[p]}
            isActive={activeProvider === p}
          />
        ))}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">How it works</p>
        <p>The backend reads your active provider and key on every request. Switching provider here takes effect on the next generation — no restart needed.</p>
        <p className="mt-1">If a key is also set as an environment variable (<span className="font-mono">GOOGLE_API_KEY</span>, <span className="font-mono">OPENAI_API_KEY</span>, <span className="font-mono">ANTHROPIC_API_KEY</span>), the key entered here takes priority.</p>
      </div>
    </div>
  );
}
