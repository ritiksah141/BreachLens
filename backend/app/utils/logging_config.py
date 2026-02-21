"""
Structured logging configuration for BreachLens.

Provides JSON logging for production with human-readable logging for development.
"""
import logging
import sys
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter that adds standard fields and request context.

    Formats log records as JSON suitable for CloudWatch, Datadog, or Splunk ingestion.
    """

    def add_fields(self, log_record, record, message_dict):
        """Add custom fields to every log record."""
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)

        # Standardize field names
        log_record['timestamp'] = record.created
        log_record['level'] = record.levelname
        log_record['logger_name'] = record.name
        log_record['filename'] = record.filename
        log_record['line_number'] = record.lineno
        log_record['function_name'] = record.funcName

        # Add process/thread info
        log_record['process_id'] = record.process
        log_record['thread_id'] = record.thread

        # Add request ID if available (will be set by middleware)
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id


def configure_logging(app_config):
    """
    Configure application logging based on environment.

    Args:
        app_config: Flask config object
    """
    environment = app_config.get('ENV', 'development')
    log_level = app_config.get('LOG_LEVEL', 'INFO')

    # Get root logger
    root_logger = logging.getLogger()

    # Validate log level
    normalized_level = log_level.upper()
    if not hasattr(logging, normalized_level) or normalized_level not in logging._nameToLevel:
        import warnings
        warnings.warn(
            f"Invalid LOG_LEVEL '{log_level}'. Valid levels: DEBUG, INFO, WARNING, ERROR, CRITICAL. "
            "Defaulting to INFO.",
            RuntimeWarning
        )
        normalized_level = 'INFO'

    root_logger.setLevel(getattr(logging, normalized_level))

    # Remove existing handlers
    root_logger.handlers = []

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, normalized_level))

    if environment == 'production':
        # Production: JSON formatted logs
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(logger_name)s %(message)s',
            rename_fields={
                "levelname": "level",
                "name": "logger_name",
                "created": "timestamp"
            }
        )
    else:
        # Development: Human-readable logs (no colors - use colorlog for colored output)
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Suppress noisy third-party loggers
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)

    return root_logger
