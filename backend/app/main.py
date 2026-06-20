"""
GaiaMind360 — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="GaiaMind360 API",
    description="Environmental AI Platform — Real-Time Planetary Intelligence",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gaiamind360.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import global_data, digital_twin_routes

app.include_router(global_data.router)
app.include_router(digital_twin_routes.router)


@app.get("/")
async def root():
    return {
        "status": "operational",
        "app": "GaiaMind360 API",
        "version": "1.0.0",
        "docs": "/docs",
        "website": "https://gaiamind360.com",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
