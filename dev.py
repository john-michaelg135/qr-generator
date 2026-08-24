"""Local development server — serves both API and static files from one process."""

import uvicorn
from fastapi.staticfiles import StaticFiles

from api.generate import app

# Mount static files AFTER the API routes so /api/* takes priority
app.mount("/", StaticFiles(directory="public", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("dev:app", host="127.0.0.1", port=3000, reload=True)
