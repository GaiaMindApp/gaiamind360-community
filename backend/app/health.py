"""
Health Check Endpoints
Kubernetes-ready liveness and readiness probes
"""

from fastapi import APIRouter, HTTPException
import httpx
import logging
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/web")
async def health_web():
    """Web API health check"""
    return {
        "status": "healthy",
        "service": "web",
        "timestamp": datetime.utcnow().isoformat(),
        "mode": settings.MODE,
        "ml_enabled": settings.ENABLE_LOCAL_ML,
        "version": "2.0.0"
    }


@router.get("/ml")
async def health_ml():
    """ML service health check"""
    if not settings.ENABLE_LOCAL_ML:
        return {
            "status": "disabled",
            "service": "ml",
            "reason": "ENABLE_LOCAL_ML=false"
        }
    
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{settings.ML_SERVICE_URL}/health")
            return response.json()
    except Exception as e:
        logger.error(f"❌ ML service health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"ML service unavailable: {str(e)}")


@router.get("/ready")
async def readiness():
    """Kubernetes readiness probe"""
    checks = {
        "web": "ready",
        "ml": "disabled" if not settings.ENABLE_LOCAL_ML else "checking"
    }
    
    if settings.ENABLE_LOCAL_ML:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{settings.ML_SERVICE_URL}/health", timeout=5)
                if response.status_code == 200:
                    checks["ml"] = "ready"
                else:
                    checks["ml"] = "not_ready"
                    raise HTTPException(status_code=503, detail="ML service not ready")
        except Exception as e:
            logger.error(f"❌ ML service not ready: {e}")
            checks["ml"] = "not_ready"
            raise HTTPException(status_code=503, detail="ML service not ready")
    
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks
    }


@router.get("/live")
async def liveness():
    """Kubernetes liveness probe"""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }
