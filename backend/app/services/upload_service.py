"""Hardened image upload: validate magic bytes, re-encode via Pillow, store with a UUID name.

This defends against CWE-434 (unrestricted upload): we never trust the filename or the
declared Content-Type, and we only ever persist bytes that Pillow regenerated (stripping
EXIF/embedded scripts/polyglot payloads). See docs/SECURITY.md §3.
"""

import io
import uuid
from pathlib import Path

import filetype
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import get_settings

settings = get_settings()

_EXT_BY_MIME = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_PIL_FORMAT_BY_MIME = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}


async def save_image(file: UploadFile, subdir: str = "bikes") -> str:
    # Read at most max+1 bytes so a huge upload can't exhaust memory.
    contents = await file.read(settings.max_upload_bytes + 1)
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Image exceeds the {settings.max_upload_mb} MB limit",
        )
    if not contents:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")

    # 1) Verify the true type from magic bytes (not the client-supplied header).
    kind = filetype.guess(contents)
    if kind is None or kind.mime not in settings.allowed_image_types:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Unsupported image type. Allowed: JPEG, PNG, WEBP.",
        )
    mime = kind.mime

    # 2) Re-encode through Pillow — strips metadata/embedded payloads.
    try:
        Image.open(io.BytesIO(contents)).verify()  # integrity check
        image = Image.open(io.BytesIO(contents))  # reopen (verify() consumes the object)
        fmt = _PIL_FORMAT_BY_MIME[mime]
        if fmt == "JPEG" and image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")
        buffer = io.BytesIO()
        image.save(buffer, format=fmt)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - any decode failure is a bad image
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or corrupt image") from exc

    # 3) Store with a random filename (no path traversal / overwrite / guessable URL).
    filename = f"{uuid.uuid4().hex}{_EXT_BY_MIME[mime]}"
    dest_dir = Path(settings.upload_dir) / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / filename).write_bytes(buffer.getvalue())

    return f"/uploads/{subdir}/{filename}"


def delete_image_file(url_path: str) -> None:
    """Best-effort delete of a file previously returned by save_image."""
    prefix = "/uploads/"
    if not url_path.startswith(prefix):
        return
    target = Path(settings.upload_dir) / url_path[len(prefix):]
    try:
        if target.is_file():
            target.unlink()
    except OSError:
        pass
