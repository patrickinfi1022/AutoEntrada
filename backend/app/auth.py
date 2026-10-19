"""Small HS256 verifier for API access tokens issued by the SaaS identity service.

Tokens must contain: sub, tenant_id, role, exp. Login/token issuance is intentionally
owned by the application's identity service; never trust tenant IDs from request bodies.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Identity:
    subject: str
    tenant_id: str
    role: str


def _decode_segment(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


async def get_identity(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Identity:
    unauthorized = HTTPException(status_code=401, detail="Se requiere una sesión válida")
    secret = os.getenv("JWT_SECRET", "")
    if not secret or len(secret) < 32 or credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        header_part, payload_part, signature_part = credentials.credentials.split(".")
        header = json.loads(_decode_segment(header_part))
        claims = json.loads(_decode_segment(payload_part))
        if header.get("alg") != "HS256":
            raise unauthorized
        signed = f"{header_part}.{payload_part}".encode("ascii")
        expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _decode_segment(signature_part)):
            raise unauthorized
        if float(claims.get("exp", 0)) <= time.time():
            raise unauthorized

        expected_issuer = os.getenv("JWT_ISSUER")
        expected_audience = os.getenv("JWT_AUDIENCE")
        if expected_issuer and claims.get("iss") != expected_issuer:
            raise unauthorized
        if expected_audience:
            audiences = claims.get("aud", [])
            if isinstance(audiences, str):
                audiences = [audiences]
            if expected_audience not in audiences:
                raise unauthorized

        subject = str(claims["sub"])
        tenant_id = str(claims["tenant_id"])
        role = str(claims["role"])
        if not subject or not tenant_id or role not in {"Admin", "Seguridad", "Usuario"}:
            raise unauthorized
        return Identity(subject=subject, tenant_id=tenant_id, role=role)
    except HTTPException:
        raise
    except Exception as exc:
        raise unauthorized from exc
