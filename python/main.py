from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from errors import ServiceError
from routers import cache, convert, score


app = FastAPI(title="ToneForge Voice Server", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.code, "message": exc.message},
    )


@app.exception_handler(UnicodeDecodeError)
async def unicode_decode_error_handler(_: Request, __: UnicodeDecodeError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "detail": "invalid_audio",
            "message": "binary audio uploads must use POST /convert/upload as multipart/form-data with field name file",
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/demo")
async def demo() -> FileResponse:
    return FileResponse(Path(__file__).with_name("a.html"))


app.include_router(convert.router)
app.include_router(score.router)
app.include_router(cache.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

