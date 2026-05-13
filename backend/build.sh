#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run the OSINT ETL Pipeline to generate the Bloom Filter and sync metadata
# We use --use-cache if the file exists to speed up builds on Render
if [ -f "seed/hibp_raw.json" ]; then
    python seed/pipeline.py --use-cache --verbose
else
    python seed/pipeline.py --verbose
fi

echo "Build process complete. Bloom Filter generated and Metadata synced."
