"""
response.py — Standard JSON response builders for BreachLens API.
"""
import json
from datetime import datetime, date
from flask import jsonify
from bson import ObjectId


class MongoJSONEncoder(json.JSONEncoder):
    """Extend JSONEncoder to handle ObjectId and datetime objects."""

    def default(self, obj: object) -> str:
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def _serialise(data: object) -> object:
    """Recursively serialise MongoDB documents for JSON output."""
    return json.loads(json.dumps(data, cls=MongoJSONEncoder))


def success_response(
    data: object,
    status_code: int = 200,
    meta: dict | None = None,
) -> tuple:
    """
    Build a standard success envelope.

    Args:
        data: The response payload.
        status_code: HTTP status code (default 200).
        meta: Optional pagination / metadata dict.

    Returns:
        (flask.Response, int) tuple.
    """
    body: dict = {"status": "success", "data": _serialise(data)}
    if meta is not None:
        body["meta"] = _serialise(meta)
    return jsonify(body), status_code


def error_response(
    message: str,
    status_code: int,
    details: dict | None = None,
) -> tuple:
    """
    Build a standard error envelope.

    Args:
        message: Human-readable error description.
        status_code: HTTP status code.
        details: Optional validation details dict.

    Returns:
        (flask.Response, int) tuple.
    """
    body: dict = {"status": "error", "message": message, "code": status_code}
    if details is not None:
        body["details"] = _serialise(details)
    return jsonify(body), status_code
