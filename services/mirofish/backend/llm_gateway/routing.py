"""Routing config loader with hot-reload.

Reads `services/mirofish/config/llm-routing.yaml`. Polls the file's mtime
every 30 seconds; on change, atomically swaps the in-memory config so
callers always see a complete, validated copy.

The config is process-local. In a multi-machine deployment we publish
the YAML to a shared volume (in our case: bundled into the Docker image
for now; in M19.7 we'll back it with the `FeatureFlag`-style admin
endpoint that mirrors writes to a git-tracked YAML file).
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from .errors import ConfigError
from .stages import Stage


DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "llm-routing.yaml"
POLL_INTERVAL_SEC = 30


@dataclass(frozen=True)
class TierConfig:
    tier: str  # "S" | "M" | "L"
    primary: str
    fallbacks: tuple[str, ...]
    temperature: float
    max_tokens: int

    def candidates(self) -> tuple[str, ...]:
        """Primary first, then fallbacks in order."""
        return (self.primary, *self.fallbacks)


@dataclass(frozen=True)
class RoutingConfig:
    version: int
    tiers: dict[str, TierConfig]
    stage_tier: dict[Stage, str]  # stage -> "S"|"M"|"L"
    stage_overrides: dict[Stage, dict[str, Any]] = field(default_factory=dict)

    def resolve(self, stage: Stage) -> tuple[TierConfig, dict[str, Any]]:
        """Return the (tier_config, per_stage_overrides) for a stage."""
        tier_key = self.stage_tier.get(stage)
        if tier_key is None:
            raise ConfigError(f"no tier mapped for stage {stage.value}")
        tier = self.tiers.get(tier_key)
        if tier is None:
            raise ConfigError(f"tier {tier_key!r} referenced by stage {stage.value} not defined")
        overrides = self.stage_overrides.get(stage, {})
        return tier, overrides


def _parse(raw: dict[str, Any]) -> RoutingConfig:
    if not isinstance(raw, dict):
        raise ConfigError("routing yaml must be a mapping at the top level")
    version = raw.get("version", 1)
    if not isinstance(version, int):
        raise ConfigError("`version` must be an integer")

    tiers_raw = raw.get("tiers")
    if not isinstance(tiers_raw, dict) or set(tiers_raw.keys()) - {"S", "M", "L"}:
        raise ConfigError("`tiers` must define keys S, M, L (extra keys not allowed)")
    if {"S", "M", "L"} - set(tiers_raw.keys()):
        raise ConfigError("`tiers` must define all of S, M, L")

    tiers: dict[str, TierConfig] = {}
    for tier_key, t in tiers_raw.items():
        if not isinstance(t, dict):
            raise ConfigError(f"tier {tier_key}: must be a mapping")
        primary = t.get("primary")
        if not isinstance(primary, str) or not primary:
            raise ConfigError(f"tier {tier_key}: `primary` is required (non-empty string)")
        fallbacks_raw = t.get("fallbacks", [])
        if not isinstance(fallbacks_raw, list) or not all(isinstance(x, str) for x in fallbacks_raw):
            raise ConfigError(f"tier {tier_key}: `fallbacks` must be a list of strings")
        temperature = float(t.get("temperature", 0.5))
        max_tokens = int(t.get("max_tokens", 4096))
        if max_tokens <= 0:
            raise ConfigError(f"tier {tier_key}: `max_tokens` must be positive")
        tiers[tier_key] = TierConfig(
            tier=tier_key,
            primary=primary,
            fallbacks=tuple(fallbacks_raw),
            temperature=temperature,
            max_tokens=max_tokens,
        )

    stage_tier_raw = raw.get("stage_tier", {})
    if not isinstance(stage_tier_raw, dict):
        raise ConfigError("`stage_tier` must be a mapping")
    stage_tier: dict[Stage, str] = {}
    for stage_name, tier_key in stage_tier_raw.items():
        if stage_name not in Stage.values():
            raise ConfigError(f"unknown stage {stage_name!r} in stage_tier")
        if tier_key not in tiers:
            raise ConfigError(f"stage {stage_name} mapped to unknown tier {tier_key}")
        stage_tier[Stage(stage_name)] = tier_key

    # Ensure every stage is mapped (avoids surprises at runtime).
    missing = Stage.values() - {s.value for s in stage_tier.keys()}
    if missing:
        raise ConfigError(f"stage_tier is missing assignments for: {sorted(missing)}")

    overrides_raw = raw.get("stage_overrides", {})
    if not isinstance(overrides_raw, dict):
        raise ConfigError("`stage_overrides` must be a mapping")
    overrides: dict[Stage, dict[str, Any]] = {}
    for stage_name, o in overrides_raw.items():
        if stage_name not in Stage.values():
            raise ConfigError(f"unknown stage {stage_name!r} in stage_overrides")
        if not isinstance(o, dict):
            raise ConfigError(f"stage_overrides[{stage_name}] must be a mapping")
        overrides[Stage(stage_name)] = o

    return RoutingConfig(
        version=version,
        tiers=tiers,
        stage_tier=stage_tier,
        stage_overrides=overrides,
    )


class RoutingConfigStore:
    """Thread-safe loader with mtime polling."""

    def __init__(self, path: Path = DEFAULT_CONFIG_PATH) -> None:
        self._path = path
        self._lock = threading.Lock()
        self._config: RoutingConfig | None = None
        self._mtime: float | None = None
        self._last_poll: float = 0
        self.reload()

    def reload(self) -> RoutingConfig:
        if not self._path.exists():
            raise ConfigError(f"routing yaml not found at {self._path}")
        text = self._path.read_text(encoding="utf-8")
        try:
            raw = yaml.safe_load(text)
        except yaml.YAMLError as exc:
            raise ConfigError(f"invalid yaml in {self._path}: {exc}") from exc
        cfg = _parse(raw)
        with self._lock:
            self._config = cfg
            self._mtime = self._path.stat().st_mtime
            self._last_poll = time.monotonic()
        return cfg

    def get(self) -> RoutingConfig:
        # Cheap mtime poll. Lock only when we believe we need to reload.
        now = time.monotonic()
        if now - self._last_poll > POLL_INTERVAL_SEC:
            try:
                mtime = self._path.stat().st_mtime
            except OSError:
                mtime = None
            if mtime is not None and mtime != self._mtime:
                self.reload()
            else:
                with self._lock:
                    self._last_poll = now
        assert self._config is not None
        return self._config


_store: RoutingConfigStore | None = None


def get_routing_config() -> RoutingConfig:
    global _store
    if _store is None:
        path_env = os.environ.get("LLM_ROUTING_CONFIG")
        path = Path(path_env) if path_env else DEFAULT_CONFIG_PATH
        _store = RoutingConfigStore(path)
    return _store.get()


def reset_for_tests(path: Path | None = None) -> None:
    """Force a reload — exposed for tests that swap YAML on disk."""
    global _store
    _store = RoutingConfigStore(path or DEFAULT_CONFIG_PATH)
