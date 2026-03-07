"""
extensions.py — Flask extension instances (initialised here, wired in create_app).

Note: JWT handling uses the raw ``pyjwt`` library directly (via
``app.middleware.auth_middleware``).
"""
from flask_pymongo import PyMongo
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache

mongo: PyMongo = PyMongo()
cors: CORS = CORS()
limiter: Limiter = Limiter(key_func=get_remote_address)
cache: Cache = Cache()
