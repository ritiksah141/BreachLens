#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run the OSINT ETL Pipeline to generate the Bloom Filter and sync metadata
# This is disabled by default in CI/Render builds to avoid DB connection failures.
if [ "${RUN_SEED:-false}" = "true" ] && [ -n "${MONGO_URI:-}" ]; then
    # We use --use-cache if the file exists to speed up builds
    if [ -f "seed/hibp_raw.json" ]; then
        python seed/pipeline.py --use-cache --verbose
    else
        python seed/pipeline.py --verbose
    fi
    echo "Build process complete. Bloom Filter generated and Metadata synced."
else
    echo "Skipping seed pipeline (set RUN_SEED=true and MONGO_URI to enable)."
fi
