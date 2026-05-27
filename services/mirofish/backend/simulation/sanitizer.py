"""Input sanitization for LLM prompts.

Prevents prompt injection attacks on custom model uploads and
scenario parameter strings.
"""
from __future__ import annotations
import html
import re


_INJECTION_PATTERNS = [
    r"ignore\s+(previous|all|above)\s+instructions?",
    r"you\s+are\s+now",
    r"pretend\s+(to\s+be|you\s+are)",
    r"act\s+as\s+(an?\s+)?(?:evil|unrestricted|jailbroken)",
    r"disregard\s+(?:your|all|previous)",
    r"<\|.*?\|>",           # token delimiters
    r"\{\{.*?\}\}",         # template injection
    r"system\s*:\s*",       # fake system messages
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Strip HTML, truncate, and check for injection patterns.

    Raises ValueError if a prompt injection pattern is detected.

    Args:
        value: The raw string to sanitize.
        max_length: Maximum allowed length after cleaning. Defaults to 1000.

    Returns:
        The cleaned, safe string.

    Raises:
        ValueError: If a prompt injection pattern is found.
    """
    # Decode HTML entities then strip tags.
    cleaned = html.unescape(value)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    # Truncate to max_length before pattern checking to bound work.
    cleaned = cleaned[:max_length]
    # Check for injection patterns.
    for pattern in _COMPILED:
        if pattern.search(cleaned):
            raise ValueError(
                f"Potential prompt injection detected in input"
            )
    return cleaned.strip()


def sanitize_parameters(params: dict) -> dict:
    """Recursively sanitize string values in a parameters dict.

    String values are HTML-stripped, truncated (to 500 chars), and
    checked for injection patterns. Numeric and boolean values are
    passed through unchanged. Unknown types are coerced to str and
    truncated to 200 chars.

    Args:
        params: Flat or nested dict of simulation parameters.

    Returns:
        A new dict with all string values sanitized.

    Raises:
        ValueError: If any string value contains a prompt injection pattern.
    """
    result = {}
    for k, v in params.items():
        if isinstance(v, str):
            result[k] = sanitize_string(v, max_length=500)
        elif isinstance(v, dict):
            result[k] = sanitize_parameters(v)
        elif isinstance(v, (int, float, bool)):
            result[k] = v
        else:
            result[k] = str(v)[:200]
    return result
