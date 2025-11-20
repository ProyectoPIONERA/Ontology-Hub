#!/bin/bash
set -e

# /app/scripts/bin/aggregator /app/scripts/lov.config
/app/scripts/bin/create-index /app/scripts/lov.config
/app/scripts/bin/stats /app/scripts/lov.config
/app/scripts/bin/mongo2rdf /app/scripts/lov.config
/app/scripts/bin/index-lov /app/scripts/lov.config
