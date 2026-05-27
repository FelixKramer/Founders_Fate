"""Thin wrapper around Zep Cloud for agent memory.

If ZEP_API_KEY is not set or the Zep call fails, falls back silently to
in-process dict storage. This ensures the simulation runs even without Zep.
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_USE_ZEP = bool(os.environ.get("ZEP_API_KEY"))
_fallback_store: dict[str, list[dict[str, Any]]] = {}

try:
    if _USE_ZEP:
        from zep_cloud.client import Zep as ZepClient  # type: ignore[import-untyped]

        _zep_client = ZepClient(api_key=os.environ["ZEP_API_KEY"])
    else:
        _zep_client = None
except ImportError:
    logger.warning("zep_cloud package not installed; using in-process memory fallback")
    _zep_client = None
    _USE_ZEP = False


class ZepWrapper:
    """Session-scoped memory for a simulation run."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self._local: list[dict[str, Any]] = []

    def add_memory(self, role: str, content: str, metadata: dict[str, Any] | None = None) -> None:
        entry: dict[str, Any] = {"role": role, "content": content, "metadata": metadata or {}}
        self._local.append(entry)
        if _zep_client:
            try:
                from zep_cloud.types import Message  # type: ignore[import-untyped]

                _zep_client.memory.add(
                    session_id=self.session_id,
                    messages=[Message(role_type=role, content=content)],
                )
            except Exception as exc:
                logger.debug("Zep add_memory failed (%s) — using local fallback", exc)

    def get_memory(self, last_n: int = 10) -> list[dict[str, Any]]:
        if _zep_client:
            try:
                mem = _zep_client.memory.get(self.session_id)
                messages = getattr(mem, "messages", []) or []
                return [{"role": m.role_type, "content": m.content} for m in messages[-last_n:]]
            except Exception as exc:
                logger.debug("Zep get_memory failed (%s) — using local fallback", exc)
        return self._local[-last_n:]
