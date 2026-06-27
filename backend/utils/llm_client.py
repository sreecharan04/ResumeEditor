"""
Single abstraction over Gemini, OpenAI, and Anthropic.
All agents call generate() — they never touch provider SDKs directly.
"""
import asyncio
import base64
from dataclasses import dataclass


@dataclass
class LLMConfig:
    provider: str   # "gemini" | "openai" | "anthropic" | "cerebras"
    model: str
    api_key: str


async def generate(
    config: LLMConfig,
    prompt: str,
    system_prompt: str = "",
    image_bytes: bytes | None = None,
    image_media_type: str = "image/jpeg",
) -> str:
    if not config.api_key:
        raise ValueError(
            f"No API key configured for provider '{config.provider}'. "
            "Add it in the Settings tab."
        )
    if config.provider == "gemini":
        return await _gemini(config, prompt, system_prompt, image_bytes, image_media_type)
    elif config.provider == "openai":
        return await _openai(config, prompt, system_prompt, image_bytes, image_media_type)
    elif config.provider == "anthropic":
        return await _anthropic(config, prompt, system_prompt, image_bytes, image_media_type)
    elif config.provider == "cerebras":
        return await _cerebras(config, prompt, system_prompt)
    else:
        raise ValueError(f"Unknown provider: {config.provider!r}")


# ── Gemini ────────────────────────────────────────────────────────────────────

async def _gemini(
    config: LLMConfig,
    prompt: str,
    system_prompt: str,
    image_bytes: bytes | None = None,
    image_media_type: str = "image/jpeg",
) -> str:
    try:
        from google import genai
        from google.genai import types as gtypes
    except ImportError:
        raise RuntimeError("google-genai not installed. Run: pip install google-genai")

    def _call() -> str:
        client = genai.Client(api_key=config.api_key)
        cfg = gtypes.GenerateContentConfig(system_instruction=system_prompt or None)
        if image_bytes:
            contents = [
                gtypes.Part.from_bytes(data=image_bytes, mime_type=image_media_type),
                prompt,
            ]
        else:
            contents = prompt
        response = client.models.generate_content(model=config.model, contents=contents, config=cfg)
        return response.text or ""

    return await asyncio.to_thread(_call)


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _openai(
    config: LLMConfig,
    prompt: str,
    system_prompt: str,
    image_bytes: bytes | None = None,
    image_media_type: str = "image/jpeg",
) -> str:
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise RuntimeError("openai not installed. Run: pip install openai")

    client = AsyncOpenAI(api_key=config.api_key)
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    if image_bytes:
        b64 = base64.b64encode(image_bytes).decode()
        content: list = [
            {"type": "image_url", "image_url": {"url": f"data:{image_media_type};base64,{b64}"}},
            {"type": "text", "text": prompt},
        ]
    else:
        content = prompt  # type: ignore[assignment]

    messages.append({"role": "user", "content": content})
    response = await client.chat.completions.create(model=config.model, messages=messages)
    return response.choices[0].message.content or ""


# ── Cerebras ─────────────────────────────────────────────────────────────────

async def _cerebras(config: LLMConfig, prompt: str, system_prompt: str) -> str:
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise RuntimeError("openai not installed. Run: pip install openai")

    client = AsyncOpenAI(api_key=config.api_key, base_url="https://api.cerebras.ai/v1")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    response = await client.chat.completions.create(model=config.model, messages=messages)
    return response.choices[0].message.content or ""


# ── Anthropic ─────────────────────────────────────────────────────────────────

async def _anthropic(
    config: LLMConfig,
    prompt: str,
    system_prompt: str,
    image_bytes: bytes | None = None,
    image_media_type: str = "image/jpeg",
) -> str:
    try:
        import anthropic
    except ImportError:
        raise RuntimeError("anthropic not installed. Run: pip install anthropic")

    client = anthropic.AsyncAnthropic(api_key=config.api_key)

    if image_bytes:
        b64 = base64.b64encode(image_bytes).decode()
        content: list = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_media_type,
                    "data": b64,
                },
            },
            {"type": "text", "text": prompt},
        ]
    else:
        content = prompt  # type: ignore[assignment]

    kwargs: dict = {
        "model": config.model,
        "max_tokens": 8192,
        "messages": [{"role": "user", "content": content}],
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    response = await client.messages.create(**kwargs)
    return response.content[0].text
