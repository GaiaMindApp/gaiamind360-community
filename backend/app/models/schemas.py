"""
GaiaMind360 — Data Models (Public Schemas)
"""
from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: Optional[List[str]] = []
    language: str = "en"


class CountryEnvironmentalProfile(BaseModel):
    country: str
    iso2: str
    co2_per_capita: Optional[float] = None
    renewable_energy_share: Optional[float] = None
    forest_area_pct: Optional[float] = None
    tsi_score: Optional[float] = None


class TSIFeature(BaseModel):
    type: str = "Feature"
    properties: dict
    geometry: dict


class TSIGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: List[TSIFeature]


class PolicySimulationRequest(BaseModel):
    country: str
    policy_type: str
    parameters: dict
    horizon_years: Optional[int] = 10


class PolicySimulationResponse(BaseModel):
    country: str
    policy_type: str
    projected_co2_reduction: float
    confidence: float
    summary: str
