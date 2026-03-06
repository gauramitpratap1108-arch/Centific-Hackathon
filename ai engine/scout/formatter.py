from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any

import anthropic
import openai

import config as app_config
from scout.adapters.base import RawItem
from usage_tracker import tracker

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a concise tech-news editor. Given raw research/tech items, "
    "produce a JSON array where each element has:\n"
    '  "title": a clear headline (max 120 chars),\n'
    '  "description": a 2-3 sentence neutral summary.\n'
    "Return ONLY the JSON array, no markdown fences."
)

BATCH_SIZE = 5


@dataclass
class FormattedItem:
    title: str
    description: str
    url: str
    source_label: str
    published_at: str
    item_type: str
    metadata: dict[str, Any]


class Formatter:
    """Formats raw items using Claude or OpenAI, based on per-source config."""

    def format_batch(
        self, raw_items: list[RawItem], source_config: dict[str, Any] | None = None,
    ) -> list[FormattedItem]:
        if not raw_items:
            logger.debug("[Formatter] Empty batch, nothing to format")
            return []

        cfg = source_config or {}
        provider = cfg.get("ai_provider", "claude")
        model = cfg.get("ai_model", "")
        api_key = cfg.get("ai_api_key", "")

        if provider == "openai":
            key = api_key or app_config.OPENAI_API_KEY
            mdl = model or "gpt-5.4"
            if not key:
                logger.error("[Formatter] OpenAI selected but no API key (source config or OPENAI_API_KEY env)")
                return self._fallback_format(raw_items)
            logger.info("[Formatter] Using OpenAI provider=%s model=%s", provider, mdl)
            return self._format_all(raw_items, provider="openai", model=mdl, api_key=key)
        else:
            key = api_key or app_config.ANTHROPIC_API_KEY
            mdl = model or "claude-sonnet-4-6"
            if not key:
                logger.error("[Formatter] Claude selected but no API key (source config or ANTHROPIC_API_KEY env)")
                return self._fallback_format(raw_items)
            logger.info("[Formatter] Using Claude provider=%s model=%s", provider, mdl)
            return self._format_all(raw_items, provider="claude", model=mdl, api_key=key)

    def _format_all(
        self, raw_items: list[RawItem], *, provider: str, model: str, api_key: str,
    ) -> list[FormattedItem]:
        logger.info("[Formatter] Formatting %d items in batches of %d", len(raw_items), BATCH_SIZE)
        results: list[FormattedItem] = []

        for i in range(0, len(raw_items), BATCH_SIZE):
            batch = raw_items[i : i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (len(raw_items) + BATCH_SIZE - 1) // BATCH_SIZE
            logger.info("[Formatter] Processing batch %d/%d (%d items)", batch_num, total_batches, len(batch))

            if provider == "openai":
                formatted = self._call_openai(batch, model=model, api_key=api_key)
            else:
                formatted = self._call_claude(batch, model=model, api_key=api_key)
            results.extend(formatted)

        logger.info("[Formatter] Formatted %d items total", len(results))
        return results

    # ── Claude ───────────────────────────────────────────────────────────

    def _call_claude(self, batch: list[RawItem], *, model: str, api_key: str) -> list[FormattedItem]:
        client = anthropic.Anthropic(api_key=api_key)
        user_msg = self._build_user_message(batch)

        try:
            start_time = time.time()
            logger.debug("[Formatter] Calling Claude %s with %d items...", model, len(batch))

            response = client.messages.create(
                model=model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )

            elapsed = time.time() - start_time
            in_tok = getattr(response.usage, "input_tokens", 0)
            out_tok = getattr(response.usage, "output_tokens", 0)
            logger.info("[Formatter] Claude responded in %.1fs (tokens: in=%s out=%s)", elapsed, in_tok, out_tok)

            if isinstance(in_tok, int) and isinstance(out_tok, int):
                tracker.record(service="scout", model=model, input_tokens=in_tok, output_tokens=out_tok)

            text = response.content[0].text.strip()
            parsed = self._parse_response(text)

        except anthropic.APIError as exc:
            logger.error("[Formatter] Claude API error: %s (status=%s)", exc.message, getattr(exc, "status_code", "?"))
            parsed = self._raw_fallback(batch)
        except Exception as exc:
            logger.exception("[Formatter] Claude unexpected error: %s", exc)
            parsed = self._raw_fallback(batch)

        return self._build_results(batch, parsed)

    # ── OpenAI ───────────────────────────────────────────────────────────

    # Models that require max_completion_tokens instead of max_tokens
    _NEW_PARAM_MODELS = {
        "gpt-5.4", "gpt-5.4-pro", "gpt-5.4-thinking",
        "gpt-5-mini", "gpt-5.3-codex",
        "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
        "gpt-4o", "gpt-4o-mini",
        "o1", "o1-mini", "o1-pro", "o3", "o3-mini", "o4-mini",
    }

    def _call_openai(self, batch: list[RawItem], *, model: str, api_key: str) -> list[FormattedItem]:
        client = openai.OpenAI(api_key=api_key)
        user_msg = self._build_user_message(batch)

        uses_new_param = any(model.startswith(p) for p in self._NEW_PARAM_MODELS)

        params: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
        }

        if uses_new_param:
            params["max_completion_tokens"] = 2048
        else:
            params["max_tokens"] = 2048

        try:
            start_time = time.time()
            logger.debug("[Formatter] Calling OpenAI %s with %d items (token_param=%s)...",
                         model, len(batch), "max_completion_tokens" if uses_new_param else "max_tokens")

            response = client.chat.completions.create(**params)

            elapsed = time.time() - start_time
            usage = response.usage
            in_tok = usage.prompt_tokens if usage else 0
            out_tok = usage.completion_tokens if usage else 0
            logger.info("[Formatter] OpenAI responded in %.1fs (tokens: in=%s out=%s)", elapsed, in_tok, out_tok)

            if isinstance(in_tok, int) and isinstance(out_tok, int):
                tracker.record(service="scout", model=model, input_tokens=in_tok, output_tokens=out_tok)

            text = (response.choices[0].message.content or "").strip()
            parsed = self._parse_response(text)

        except openai.APIError as exc:
            logger.error("[Formatter] OpenAI API error (model=%s): %s", model, exc)
            parsed = self._raw_fallback(batch)
        except Exception as exc:
            logger.exception("[Formatter] OpenAI unexpected error (model=%s): %s", model, exc)
            parsed = self._raw_fallback(batch)

        return self._build_results(batch, parsed)

    # ── Shared helpers ───────────────────────────────────────────────────

    @staticmethod
    def _build_user_message(batch: list[RawItem]) -> str:
        input_items = []
        for idx, item in enumerate(batch):
            input_items.append({
                "index": idx,
                "raw_title": item.title,
                "raw_snippet": item.snippet[:1500],
                "source": item.source_label,
            })
        return json.dumps(input_items, ensure_ascii=False)

    @staticmethod
    def _parse_response(text: str) -> list[dict]:
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error("[Formatter] Failed to parse AI response as JSON: %s\nRaw: %s", exc, text[:500])
            return []

    @staticmethod
    def _raw_fallback(batch: list[RawItem]) -> list[dict]:
        return [
            {"title": item.title[:120], "description": item.snippet[:300]}
            for item in batch
        ]

    def _fallback_format(self, raw_items: list[RawItem]) -> list[FormattedItem]:
        logger.warning("[Formatter] Using raw fallback (no AI) for %d items", len(raw_items))
        return [
            FormattedItem(
                title=item.title[:120],
                description=item.snippet[:300],
                url=item.url,
                source_label=item.source_label,
                published_at=item.published_at,
                item_type=item.item_type,
                metadata=item.metadata,
            )
            for item in raw_items
        ]

    @staticmethod
    def _build_results(batch: list[RawItem], parsed: list[dict]) -> list[FormattedItem]:
        formatted: list[FormattedItem] = []
        for idx, item in enumerate(batch):
            entry = parsed[idx] if idx < len(parsed) else {}
            formatted.append(
                FormattedItem(
                    title=entry.get("title", item.title)[:120],
                    description=entry.get("description", item.snippet[:300]),
                    url=item.url,
                    source_label=item.source_label,
                    published_at=item.published_at,
                    item_type=item.item_type,
                    metadata=item.metadata,
                )
            )
        return formatted
