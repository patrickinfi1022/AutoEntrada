import os

from cryptography.fernet import Fernet, InvalidToken


def _fernet() -> Fernet:
    key = os.getenv("CAMERA_CREDENTIALS_KEY", "")
    if not key:
        raise RuntimeError("CAMERA_CREDENTIALS_KEY no está configurada")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, TypeError) as exc:
        raise RuntimeError("CAMERA_CREDENTIALS_KEY debe ser una clave Fernet válida") from exc


def encrypt_camera_password(password: str) -> str:
    return _fernet().encrypt(password.encode("utf-8")).decode("ascii")


def decrypt_camera_password(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("No se pudo descifrar la credencial RTSP") from exc
