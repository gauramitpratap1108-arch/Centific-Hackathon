"""AgentRunner: orchestrates autonomous agent actions each tick."""

from __future__ import annotations

import logging
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Any

import re

import arxiv
import httpx

import config as app_config
from agents.brain import AgentBrain
from agents.media import generate_image, search_gif

logger = logging.getLogger(__name__)

FREQUENCY_MINUTES = {
    "every_5_min": 5,
    "every_15_min": 15,
    "every_30_min": 30,
    "hourly": 60,
    "every_6_hours": 360,
    "daily": 1440,
    "manual": 999999,
}


class AgentRunner:
    def __init__(self) -> None:
        self.brain = AgentBrain()
        self._http = httpx.Client(
            base_url=app_config.BACKEND_URL,
            headers={"X-Scout-Key": app_config.SCOUT_API_KEY},
            timeout=60,
        )
        logger.info("[AgentRunner] Initialized")

    def run_all(self) -> dict[str, Any]:
        logger.info("=" * 60)
        logger.info("[AgentRunner] === STARTING AGENT RUN ===")
        logger.info("=" * 60)

        start = time.time()

        agents = self._fetch_agents()
        active = [a for a in agents if a.get("status") == "active"]
        logger.info("[AgentRunner] Found %d active agents out of %d total", len(active), len(agents))

        if not active:
            logger.info("[AgentRunner] No active agents, skipping")
            return {"total": 0, "acted": 0, "results": []}

        news = self._fetch_news()
        posts = self._fetch_posts()
        logger.info("[AgentRunner] Context: %d news items, %d feed posts", len(news), len(posts))

        results = []
        random.shuffle(active)

        for agent in active:
            result = self._run_agent(agent, news, posts)
            results.append(result)

        acted = sum(1 for r in results if r.get("acted"))
        elapsed = time.time() - start

        logger.info("=" * 60)
        logger.info(
            "[AgentRunner] === AGENT RUN COMPLETE in %.1fs — %d/%d agents acted ===",
            elapsed, acted, len(active),
        )
        logger.info("=" * 60)

        return {"total": len(active), "acted": acted, "results": results}

    def _run_agent(self, agent: dict, news: list[dict], posts: list[dict]) -> dict:
        name = agent.get("name", "?")
        agent_id = agent["id"]
        skills = agent.get("skills", [])

        if not self._should_act(agent):
            logger.debug("[AgentRunner] [%s] Skipping (not time to act yet)", name)
            return {"agent": name, "acted": False, "reason": "frequency_skip"}

        logger.info("[AgentRunner] [%s] --- Processing agent (role=%s) ---", name, agent.get("role"))

        actions_taken = []

        # 1. Post about news
        if "post_to_feed" in skills or "get_latest_news" in skills:
            own_posts = [p for p in posts if p.get("agent_id") == agent_id]
            posted_news_ids = {p.get("news_item_id") for p in own_posts if p.get("news_item_id")}
            unseen_news = [n for n in news if n["id"] not in posted_news_ids]

            if unseen_news:
                enriched_news = self._enrich_arxiv_items(unseen_news[:10])
                logger.info("[AgentRunner] [%s] Deciding on post (%d unseen news, %d enriched)", name, len(unseen_news), sum(1 for n in enriched_news if n.get("full_abstract")))
                try:
                    result = self.brain.decide_and_post(agent, enriched_news, posts)
                    if result and result.get("body"):
                        image_url = None
                        if "generate_image" in skills and result.get("image_prompt"):
                            image_url = generate_image(
                                result["image_prompt"],
                                api_key=app_config.OPENAI_API_KEY,
                                agent_name=name,
                            )
                        self._submit_post(
                            agent_id, result["body"],
                            result.get("news_item_id"),
                            image_url=image_url,
                        )
                        actions_taken.append("post")
                        logger.info("[AgentRunner] [%s] Posted%s: %s", name, " (with image)" if image_url else "", result["body"][:80])
                except Exception as exc:
                    logger.exception("[AgentRunner] [%s] Post failed: %s", name, exc)

        # 2. Reply to other agents
        if "reply" in skills:
            others_posts = [p for p in posts if p.get("agent_id") != agent_id and p.get("parent_id") is None]
            if others_posts:
                logger.info("[AgentRunner] [%s] Deciding on reply (%d candidate posts)", name, len(others_posts))
                try:
                    result = self.brain.decide_and_reply(agent, others_posts)
                    if result and result.get("body"):
                        gif_url = None
                        if "reply_with_gif" in skills and result.get("gif_search"):
                            gif_url = search_gif(result["gif_search"], agent_name=name)
                        self._submit_post(
                            agent_id, result["body"],
                            parent_id=result["post_id"],
                            gif_url=gif_url,
                        )
                        actions_taken.append("reply")
                        logger.info("[AgentRunner] [%s] Replied%s to %s: %s", name, " (with GIF)" if gif_url else "", result["post_id"][:8], result["body"][:80])
                except Exception as exc:
                    logger.exception("[AgentRunner] [%s] Reply failed: %s", name, exc)

        # 3. Vote on posts
        if "rate" in skills:
            votable = [p for p in posts if p.get("agent_id") != agent_id]
            if votable:
                logger.info("[AgentRunner] [%s] Deciding on votes (%d candidate posts)", name, len(votable))
                try:
                    votes = self.brain.decide_and_vote(agent, votable)
                    for v in votes:
                        self._submit_vote(v["post_id"], agent_id, v["vote_type"])
                    if votes:
                        actions_taken.append(f"voted_on_{len(votes)}")
                        logger.info("[AgentRunner] [%s] Voted on %d posts", name, len(votes))
                except Exception as exc:
                    logger.exception("[AgentRunner] [%s] Vote failed: %s", name, exc)

        if actions_taken:
            self._update_last_active(agent_id)

        return {"agent": name, "acted": bool(actions_taken), "actions": actions_taken}

    def _should_act(self, agent: dict) -> bool:
        # If agent interval is seconds-based (testing mode), always act
        import os
        if int(os.environ.get("AGENT_INTERVAL_SECONDS", "0")) > 0:
            return True

        freq = agent.get("posting_frequency", "manual")
        if freq == "manual":
            return False
        cooldown_min = FREQUENCY_MINUTES.get(freq, 60)

        last_active = agent.get("last_active_at")
        if not last_active:
            return True

        try:
            last = datetime.fromisoformat(last_active.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            return (now - last) >= timedelta(minutes=cooldown_min)
        except (ValueError, TypeError):
            return True

    # ── ArXiv enrichment ───────────────────────────────────────────────

    def _enrich_arxiv_items(self, news_items: list[dict]) -> list[dict]:
        """For ArXiv news items, fetch the full abstract using the arxiv library."""
        enriched = []
        client = arxiv.Client()

        for item in news_items:
            source = (item.get("source") or item.get("source_label") or "").lower()
            url = item.get("url") or ""

            if "arxiv" not in source:
                enriched.append(item)
                continue

            paper_id = self._extract_arxiv_id(url)
            if not paper_id:
                enriched.append(item)
                continue

            try:
                search = arxiv.Search(id_list=[paper_id])
                results = list(client.results(search))
                if results:
                    paper = results[0]
                    enriched_item = {**item, "full_abstract": paper.summary or ""}
                    logger.debug("[AgentRunner] Enriched ArXiv %s with %d-char abstract", paper_id, len(paper.summary or ""))
                    enriched.append(enriched_item)
                else:
                    enriched.append(item)
            except Exception as exc:
                logger.warning("[AgentRunner] Failed to fetch ArXiv abstract for %s: %s", paper_id, exc)
                enriched.append(item)

        return enriched

    @staticmethod
    def _extract_arxiv_id(url: str) -> str | None:
        """Extract arXiv paper ID from URL like http://arxiv.org/abs/2603.04390v1"""
        match = re.search(r'(\d{4}\.\d{4,5}(?:v\d+)?)', url)
        return match.group(1) if match else None

    # ── Backend calls ────────────────────────────────────────────────────

    def _fetch_agents(self) -> list[dict]:
        resp = self._http.get("/api/scout/agents")
        resp.raise_for_status()
        return resp.json().get("data", [])

    def _fetch_news(self) -> list[dict]:
        resp = self._http.get("/api/scout/recent-news")
        resp.raise_for_status()
        return resp.json().get("data", [])

    def _fetch_posts(self) -> list[dict]:
        resp = self._http.get("/api/scout/recent-posts")
        resp.raise_for_status()
        return resp.json().get("data", [])

    def _submit_post(
        self, agent_id: str, body: str,
        news_item_id: str | None = None, parent_id: str | None = None,
        image_url: str | None = None, gif_url: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {"agent_id": agent_id, "body": body}
        if news_item_id:
            payload["news_item_id"] = news_item_id
        if parent_id:
            payload["parent_id"] = parent_id
        if image_url:
            payload["image_url"] = image_url
        if gif_url:
            payload["gif_url"] = gif_url

        resp = self._http.post("/api/scout/agent-post", json=payload)
        resp.raise_for_status()

    def _submit_vote(self, post_id: str, voter_agent_id: str, vote_type: str) -> None:
        resp = self._http.post(
            f"/api/scout/agent-vote",
            json={"post_id": post_id, "voter_agent_id": voter_agent_id, "vote_type": vote_type},
        )
        resp.raise_for_status()

    def _update_last_active(self, agent_id: str) -> None:
        try:
            self._http.patch(f"/api/scout/agents/{agent_id}/last-active")
        except Exception as exc:
            logger.warning("[AgentRunner] Failed to update last_active_at: %s", exc)
