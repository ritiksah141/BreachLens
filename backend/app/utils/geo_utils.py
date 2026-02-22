"""
geo_utils.py — GeoJSON helpers and transformation utilities.
"""
from typing import Any


def validate_coordinates(lng: Any, lat: Any) -> list[str]:
    """Validate longitude and latitude values."""
    errors: list[str] = []
    try:
        lng = float(lng)
        lat = float(lat)
    except (TypeError, ValueError):
        errors.append("'longitude' and 'latitude' must be numeric values.")
        return errors
    if not (-180 <= lng <= 180):
        errors.append("Longitude must be between -180 and 180.")
    if not (-90 <= lat <= 90):
        errors.append("Latitude must be between -90 and 90.")
    return errors


def breach_to_geojson_feature(breach: dict) -> dict:
    """
    Transform a breach MongoDB document into a GeoJSON Feature.

    Args:
        breach: Breach document from MongoDB.

    Returns:
        GeoJSON Feature dict.
    """
    location = breach.get("location") or {}
    coords = location.get("coordinates", [0.0, 0.0])
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": coords,
        },
        "properties": {
            "id": str(breach.get("_id", "")),
            "title": breach.get("title", ""),
            "severity": breach.get("severity", ""),
            "risk_score": breach.get("risk_score"),
            "affected_records_count": breach.get("affected_records_count", 0),
            "industry": breach.get("industry", ""),
            "status": breach.get("status", ""),
        },
    }


def breaches_to_feature_collection(breaches: list[dict]) -> dict:
    """
    Build a GeoJSON FeatureCollection from a list of breach documents.

    Args:
        breaches: List of breach documents.

    Returns:
        GeoJSON FeatureCollection dict.
    """
    return {
        "type": "FeatureCollection",
        "features": [breach_to_geojson_feature(b) for b in breaches],
    }
