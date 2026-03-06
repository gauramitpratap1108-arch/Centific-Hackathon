"""Web Search adapter using Tavily Search API."""

from __future__ import annotations

import logging
import os
from typing import Any
from datetime import datetime, timezone

from tavily import TavilyClient

from .base import BaseAdapter, RawItem

logger = logging.getLogger(__name__)


class WebSearchAdapter(BaseAdapter):
    """Searches the web for news, blogs, and articles using Tavily."""

    def fetch(self, topic: str, limit: int, config: dict[str, Any]) -> list[RawItem]:
        api_key = config.get("tavily_api_key") or os.environ.get("TAVILY_API_KEY", "")
        if not api_key:
            raise ValueError("Web Search requires a Tavily API key (set per-source or TAVILY_API_KEY env)")

        search_depth = config.get("search_depth", "advanced")
        focus = config.get("search_focus", "news")

        logger.info(
            "[WebSearchAdapter] Searching topic=%r limit=%d depth=%s focus=%s",
            topic, limit, search_depth, focus,
        )

        client = TavilyClient(api_key=api_key)

        try:
            response = client.search(
                query=topic,
                max_results=limit,
                search_depth=search_depth,
                topic=focus,
                include_answer=False,
            )
        except Exception as exc:
            logger.exception("[WebSearchAdapter] Tavily search failed: %s", exc)
            raise

        results = response.get("results", [])
        logger.info("[WebSearchAdapter] Got %d results from Tavily", len(results))

        items: list[RawItem] = []
        now = datetime.now(timezone.utc).isoformat()

        for r in results[:limit]:
            published = r.get("published_date") or now
            content = r.get("content", "")
            title = r.get("title", "Untitled")
            url = r.get("url", "")

            source_domain = ""
            if url:
                try:
                    from urllib.parse import urlparse
                    source_domain = urlparse(url).netloc.replace("www.", "")
                except Exception:
                    pass

            items.append(
                RawItem(
                    title=title,
                    snippet=content[:2000],
                    url=url,
                    source_label=f"Web: {source_domain}" if source_domain else "Web Search",
                    published_at=str(published),
                    item_type="update",
                    metadata={
                        "score": r.get("score", 0),
                        "domain": source_domain,
                        "search_query": topic,
                    },
                )
            )

        return items
