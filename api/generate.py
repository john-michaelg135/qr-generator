"""QR Code Generator API endpoint."""

import io
import re
from typing import Optional

import qrcode
import qrcode.image.svg
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI(title="QR Code Generator API", version="1.0.0")


# --- Security Middleware ---


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds hardening headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Prevent SVGs from executing scripts if opened directly
        if "image/" in response.headers.get("content-type", ""):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; style-src 'unsafe-inline'"
            )
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject POST bodies larger than MAX_BODY bytes."""

    MAX_BODY = 8192  # 8KB — generous for a JSON payload with 4KB of data

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.MAX_BODY:
                return Response(
                    content='{"detail":"Request body too large"}',
                    status_code=413,
                    media_type="application/json",
                )
        return await call_next(request)


# Order matters: outermost middleware runs first
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --- Validation Constants ---

MIN_SIZE = 100
MAX_SIZE = 1000
DEFAULT_SIZE = 300
MAX_BORDER = 10
MIN_BORDER = 0
DEFAULT_BORDER = 4
MAX_DATA_LENGTH = 4096
VALID_FORMATS = {"png", "svg", "jpeg"}
VALID_ERROR_CORRECTION = {"L", "M", "Q", "H"}
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")

ERROR_CORRECTION_MAP = {
    "L": qrcode.constants.ERROR_CORRECT_L,
    "M": qrcode.constants.ERROR_CORRECT_M,
    "Q": qrcode.constants.ERROR_CORRECT_Q,
    "H": qrcode.constants.ERROR_CORRECT_H,
}

CONTENT_TYPE_MAP = {
    "png": "image/png",
    "jpeg": "image/jpeg",
    "svg": "image/svg+xml",
}

FILE_EXTENSION_MAP = {
    "png": "png",
    "jpeg": "jpg",
    "svg": "svg",
}


class GenerateRequest(BaseModel):
    data: str
    size: Optional[int] = DEFAULT_SIZE
    format: Optional[str] = "png"
    error_correction: Optional[str] = "M"
    border: Optional[int] = DEFAULT_BORDER
    fill_color: Optional[str] = "#000000"
    back_color: Optional[str] = "#FFFFFF"


# --- Validation ---


def validate_params(
    data: str,
    size: int,
    fmt: str,
    error_correction: str,
    border: int,
    fill_color: str,
    back_color: str,
) -> None:
    """Validate all parameters and raise HTTPException on failure."""
    if not data:
        raise HTTPException(status_code=400, detail="Missing required parameter: data")

    if len(data) > MAX_DATA_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=f"Input exceeds maximum length of {MAX_DATA_LENGTH} characters",
        )

    if not (MIN_SIZE <= size <= MAX_SIZE):
        raise HTTPException(
            status_code=400,
            detail=f"size must be between {MIN_SIZE} and {MAX_SIZE}",
        )

    if fmt not in VALID_FORMATS:
        raise HTTPException(
            status_code=400, detail=f"Unsupported format: {fmt}"
        )

    if error_correction not in VALID_ERROR_CORRECTION:
        raise HTTPException(
            status_code=400,
            detail="error_correction must be one of: L, M, Q, H",
        )

    if not (MIN_BORDER <= border <= MAX_BORDER):
        raise HTTPException(
            status_code=400,
            detail=f"border must be between {MIN_BORDER} and {MAX_BORDER}",
        )

    if not HEX_COLOR_PATTERN.match(fill_color):
        raise HTTPException(
            status_code=400,
            detail="fill_color must be a valid hex color (e.g. #000000)",
        )

    if not HEX_COLOR_PATTERN.match(back_color):
        raise HTTPException(
            status_code=400,
            detail="back_color must be a valid hex color (e.g. #FFFFFF)",
        )


# --- QR Generation ---


def generate_qr(
    data: str,
    size: int,
    fmt: str,
    error_correction: str,
    border: int,
    fill_color: str,
    back_color: str,
) -> bytes:
    """Generate a QR code image and return raw bytes."""
    ec_level = ERROR_CORRECTION_MAP[error_correction]

    if fmt == "svg":
        factory = qrcode.image.svg.SvgPathImage
        qr = qrcode.QRCode(
            version=None,
            error_correction=ec_level,
            box_size=10,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(image_factory=factory)
        buffer = io.BytesIO()
        img.save(buffer)
        return buffer.getvalue()

    # PNG or JPEG
    qr = qrcode.QRCode(
        version=None,
        error_correction=ec_level,
        box_size=10,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    img = img.get_image()

    # Resize to requested dimensions
    img = img.resize((size, size), Image.NEAREST)

    # Convert for JPEG (no alpha channel)
    if fmt == "jpeg":
        if img.mode == "RGBA":
            img = img.convert("RGB")

    buffer = io.BytesIO()
    img.save(buffer, format=fmt.upper())
    return buffer.getvalue()


# --- Response Builder ---


def build_image_response(image_bytes: bytes, fmt: str) -> Response:
    """Build a Response with correct headers for an image."""
    content_type = CONTENT_TYPE_MAP[fmt]
    ext = FILE_EXTENSION_MAP[fmt]
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": f'inline; filename="qrcode.{ext}"',
    }
    return Response(content=image_bytes, media_type=content_type, headers=headers)


# --- Endpoints ---


@app.get("/api/generate")
async def generate_get(
    data: str = Query(None, description="Text or URL to encode"),
    size: int = Query(DEFAULT_SIZE, description="Image width/height in pixels"),
    format: str = Query("png", description="Output format: png, svg, jpeg"),
    error_correction: str = Query("M", description="Error correction level: L, M, Q, H"),
    border: int = Query(DEFAULT_BORDER, description="Quiet zone width in modules"),
    fill_color: str = Query("#000000", description="Foreground color (hex)"),
    back_color: str = Query("#FFFFFF", description="Background color (hex)"),
):
    validate_params(data or "", size, format, error_correction, border, fill_color, back_color)

    try:
        image_bytes = generate_qr(
            data, size, format, error_correction, border, fill_color, back_color
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return build_image_response(image_bytes, format)


@app.post("/api/generate")
async def generate_post(body: GenerateRequest):
    fmt = body.format or "png"
    size = body.size or DEFAULT_SIZE
    error_correction = body.error_correction or "M"
    border = body.border if body.border is not None else DEFAULT_BORDER
    fill_color = body.fill_color or "#000000"
    back_color = body.back_color or "#FFFFFF"

    validate_params(body.data, size, fmt, error_correction, border, fill_color, back_color)

    try:
        image_bytes = generate_qr(
            body.data, size, fmt, error_correction, border, fill_color, back_color
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return build_image_response(image_bytes, fmt)
