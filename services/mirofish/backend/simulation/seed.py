"""Deterministic HMAC-SHA256 seed derivation for simulation reproducibility."""
from __future__ import annotations

import hashlib
import hmac
import os


def derive_seed(simulation_id: str, user_id: str | None) -> str:
    """Deterministic seed for reproducibility within a simulation run.

    HMAC-SHA256(key=SIMULATION_SEED_SECRET, msg=f"{simulation_id}:{user_id or 'anon'}")
    Returns hex string (64 chars).
    """
    secret = os.environ.get("SIMULATION_SEED_SECRET", "dev-seed-secret-change-in-prod")
    key = secret.encode()
    msg = f"{simulation_id}:{user_id or 'anon'}".encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()
