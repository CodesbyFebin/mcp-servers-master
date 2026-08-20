"""Authentication and sensitive-text handling for MCPserver.in services.

Standard-library only: HS256 JWT signing/verification, Bearer extraction and deterministic
PII redaction. This module does not log token payloads or raw secrets.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import time
from dataclasses import dataclass
from typing import Any, Mapping


class AuthError(ValueError):
    """Raised when authentication material is invalid or expired."""


@dataclass(frozen=True)
class JwtClaims:
    subject: str
    issued_at: int
    expires_at: int
    issuer: str | None = None
    audience: str | None = None
    extra: Mapping[str, Any] | None = None


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(value + padding)
    except Exception as exc:  # pragma: no cover - implementation-specific decoder errors
        raise AuthError("invalid base64url encoding") from exc


def create_hs256_token(
    subject: str,
    secret: str,
    *,
    ttl_seconds: int = 900,
    issuer: str | None = None,
    audience: str | None = None,
    now: int | None = None,
    extra: Mapping[str, Any] | None = None,
) -> str:
    if not subject.strip():
        raise ValueError("subject is required")
    if len(secret.encode("utf-8")) < 32:
        raise ValueError("HS256 secret must be at least 32 bytes")
    if ttl_seconds <= 0:
        raise ValueError("ttl_seconds must be positive")

    issued_at = int(time.time() if now is None else now)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": issued_at,
        "exp": issued_at + ttl_seconds,
    }
    if issuer:
        payload["iss"] = issuer
    if audience:
        payload["aud"] = audience
    if extra:
        reserved = {"sub", "iat", "exp", "iss", "aud"}
        if reserved.intersection(extra):
            raise ValueError("extra claims may not override reserved JWT claims")
        payload.update(extra)

    header = {"alg": "HS256", "typ": "JWT"}
    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode())
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_payload}.{_b64url_encode(signature)}"


def verify_hs256_token(
    token: str,
    secret: str,
    *,
    issuer: str | None = None,
    audience: str | None = None,
    now: int | None = None,
    leeway_seconds: int = 0,
) -> dict[str, Any]:
    if len(secret.encode("utf-8")) < 32:
        raise ValueError("HS256 secret must be at least 32 bytes")
    parts = token.split(".")
    if len(parts) != 3:
        raise AuthError("invalid JWT shape")

    encoded_header, encoded_payload, encoded_signature = parts
    try:
        header = json.loads(_b64url_decode(encoded_header))
        payload = json.loads(_b64url_decode(encoded_payload))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise AuthError("invalid JWT JSON") from exc

    if header != {"alg": "HS256", "typ": "JWT"}:
        raise AuthError("unsupported JWT header")

    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    supplied = _b64url_decode(encoded_signature)
    if not hmac.compare_digest(expected, supplied):
        raise AuthError("invalid JWT signature")

    current = int(time.time() if now is None else now)
    try:
        expires_at = int(payload["exp"])
        issued_at = int(payload["iat"])
        subject = str(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AuthError("missing required JWT claims") from exc

    if issued_at > current + leeway_seconds:
        raise AuthError("JWT issued in the future")
    if expires_at <= current - leeway_seconds:
        raise AuthError("JWT expired")
    if issuer is not None and payload.get("iss") != issuer:
        raise AuthError("JWT issuer mismatch")
    if audience is not None and payload.get("aud") != audience:
        raise AuthError("JWT audience mismatch")
    if not subject:
        raise AuthError("JWT subject is empty")

    return payload


def bearer_token(authorization_header: str | None, *, required: bool = True) -> str | None:
    if not authorization_header:
        if required:
            raise AuthError("Bearer token required")
        return None
    scheme, separator, value = authorization_header.partition(" ")
    if separator != " " or scheme.lower() != "bearer" or not value.strip():
        raise AuthError("invalid Authorization header")
    return value.strip()


def validate_bearer(
    authorization_header: str | None,
    secret: str,
    *,
    required: bool = True,
    issuer: str | None = None,
    audience: str | None = None,
    now: int | None = None,
) -> dict[str, Any] | None:
    token = bearer_token(authorization_header, required=required)
    if token is None:
        return None
    return verify_hs256_token(token, secret, issuer=issuer, audience=audience, now=now)


_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("GSTIN", re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b", re.IGNORECASE)),
    ("PAN", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b", re.IGNORECASE)),
    ("EMAIL", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)),
    ("PHONE", re.compile(r"(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{9}(?!\d)")),
)


def redact_sensitive_text(value: str) -> str:
    redacted = value
    for label, pattern in _PATTERNS:
        redacted = pattern.sub(f"[REDACTED:{label}]", redacted)
    return redacted


def mask_pii(value: str) -> str:
    """Compatibility alias for deterministic redaction."""

    return redact_sensitive_text(value)
