#!/bin/bash
set +e

# /app/scripts/bin/aggregator /app/scripts/lov.config
echo "Corriendo create-index"
/app/scripts/bin/create-index /app/scripts/lov.config
echo "Corriendo stats"
/app/scripts/bin/stats /app/scripts/lov.config
echo "Corriendo mongo2rdf"
/app/scripts/bin/mongo2rdf /app/scripts/lov.config
echo "Corriendo index-lov"
/app/scripts/bin/index-lov /app/scripts/lov.config
