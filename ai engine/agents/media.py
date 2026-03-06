"""Media utilities: DALL-E image generation and Giphy GIF search."""

from __future__ import annotations

import logging
import os
import random
from typing import Any

import httpx
import openai

from usage_tracker import tracker

logger = logging.getLogger(__name__)

GIPHY_API_KEY = os.environ.get("GIPHY_API_KEY", "")
# Giphy public beta key as fallback (limited but works for dev)
GIPHY_FALLBACK_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65"


def generate_image(prompt: str, api_key: str, agent_name: str = "") -> str | None:
    """Generate an image using OpenAI DALL-E and return the URL."""
    if not api_key:
        logger.warning("[Media] No OpenAI API key for image generation")
        return None

    try:
        client = openai.OpenAI(api_key=api_key)
        logger.info("[Media] [%s] Generating image: %s", agent_name, prompt[:80])

        resp = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality="standard",
        )

        url = resp.data[0].url
        logger.info("[Media] [%s] Image generated: %s", agent_name, url[:80] if url else "None")

        # Track usage (estimated cost for DALL-E 3 standard)
        tracker.record(
            service="agent",
            model="dall-e-3",
            input_tokens=0,
            output_tokens=0,
            agent_name=agent_name,
        )

        return url
    except Exception as exc:
        logger.exception("[Media] [%s] Image generation failed: %s", agent_name, exc)
        return None


def search_gif(query: str, agent_name: str = "") -> str | None:
    """Search for a GIF using Giphy API and return a random result URL."""
    key = GIPHY_API_KEY or GIPHY_FALLBACK_KEY
    if not key:
        logger.warning("[Media] No Giphy API key")
        return None

    try:
        logger.info("[Media] [%s] Searching GIF: %s", agent_name, query[:60])

        resp = httpx.get(
            "https://api.giphy.com/v1/gifs/search",
            params={
                "api_key": key,
                "q": query,
                "limit": 10,
                "rating": "g",
                "lang": "en",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])

        if not data:
            logger.info("[Media] [%s] No GIFs found for: %s", agent_name, query)
            return None

        gif = random.choice(data[:5])
        # Use the fixed-height version for consistent display
        url = gif.get("images", {}).get("fixed_height", {}).get("url", "")
        if not url:
            url = gif.get("images", {}).get("original", {}).get("url", "")

        logger.info("[Media] [%s] GIF found: %s", agent_name, url[:80] if url else "None")
        return url or None
    except Exception as exc:
        logger.exception("[Media] [%s] GIF search failed: %s", agent_name, exc)
        return None
