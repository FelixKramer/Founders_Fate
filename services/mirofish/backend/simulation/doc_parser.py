"""Parse uploaded documents (PDF/DOCX/URL) into plain text for pre-mortem analysis."""
from __future__ import annotations

import io
import re


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes.

    Tries PyMuPDF first (already a project dependency), falls back to pypdf.
    """
    # Try PyMuPDF (fitz) — already in requirements.txt and more reliable
    try:
        import fitz  # type: ignore[import-untyped]

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = list(doc)[:20]
        text = "\n".join(page.get_text() for page in pages)
        doc.close()
        return _clean(text)
    except Exception:
        pass

    # Fallback: pypdf
    try:
        import pypdf  # type: ignore[import-untyped]

        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages[:20])
        return _clean(text)
    except Exception as exc:
        return f"[PDF parse error: {exc}]"


def parse_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    try:
        import docx  # type: ignore[import-untyped]

        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join(p.text for p in doc.paragraphs)
        return _clean(text)
    except Exception as exc:
        return f"[DOCX parse error: {exc}]"


def parse_url(url: str) -> str:
    """Fetch URL and extract readable text — basic HTML-stripping implementation."""
    try:
        import urllib.request

        with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310
            html = resp.read().decode("utf-8", errors="replace")
        # Strip HTML tags
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        return _clean(text[:50000])
    except Exception as exc:
        return f"[URL fetch error: {exc}]"


def _clean(text: str) -> str:
    """Remove control characters and cap at 10 000 chars."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text[:10000]
