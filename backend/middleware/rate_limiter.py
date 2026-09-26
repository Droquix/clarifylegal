import time
import logging
from typing import Dict, List, Tuple
from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("clarifylegal.ratelimit")

class IPRateLimiter:
    """
    Lightweight in-memory sliding window rate limiter per IP address.
    Protects API endpoints from key exhaustion without external database requirements.
    """
    def __init__(self, requests_per_minute: int = 15, window_seconds: int = 60) -> None:
        self.requests_per_minute: int = requests_per_minute
        self.window_seconds: int = window_seconds
        self._ip_timestamps: Dict[str, List[float]] = {}

    def is_allowed(self, ip: str) -> bool:
        """
        Checks whether the given IP is within the rate limit threshold.

        Args:
            ip (str): Client IP address.

        Returns:
            bool: True if request is permitted, False if limit is exceeded.
        """
        now: float = time.time()
        cutoff: float = now - self.window_seconds

        timestamps = self._ip_timestamps.get(ip, [])
        # Clean up expired timestamps outside window
        valid_timestamps = [t for t in timestamps if t > cutoff]

        if len(valid_timestamps) >= self.requests_per_minute:
            self._ip_timestamps[ip] = valid_timestamps
            return False

        valid_timestamps.append(now)
        self._ip_timestamps[ip] = valid_timestamps
        return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI Middleware enforcing per-IP rate limits on sensitive API routes (/api/*).
    Returns clean HTTP 429 JSON response when limit is hit.
    """
    def __init__(self, app, requests_per_minute: int = 15) -> None:
        super().__init__(app)
        self.limiter: IPRateLimiter = IPRateLimiter(requests_per_minute=requests_per_minute)

    async def dispatch(self, request: Request, call_next):
        # Exclude static assets and root health checks from rate limiting
        path: str = request.url.path
        if path.startswith("/api/"):
            client_ip: str = request.client.host if request.client else "127.0.0.1"
            # Support X-Forwarded-For header for reverse proxies (Vercel/Render)
            forwarded_for: str = request.headers.get("x-forwarded-for", "")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()

            if not self.limiter.is_allowed(client_ip):
                logger.warning("Rate limit exceeded for IP: %s on path: %s", client_ip, path)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded. Please try again shortly."}
                )

        response = await call_next(request)
        return response
