#!/bin/bash

set -euo pipefail

echo "Descargando ficheros"

# Ensure target directory exists
mkdir -p /app/jena

# Download Jena
wget -O /app/jena/apache-jena.tar.gz https://archive.apache.org/dist/jena/binaries/apache-jena-2.7.4.tar.gz
tar -xzf /app/jena/apache-jena.tar.gz -C /app/jena
rm /app/jena/apache-jena.tar.gz

# Download Fuseki
wget -O /app/jena/jena-fuseki.tar.gz https://archive.apache.org/dist/jena/binaries/jena-fuseki-1.1.1-distribution.tar.gz
tar -xzf /app/jena/jena-fuseki.tar.gz -C /app/jena
rm /app/jena/jena-fuseki.tar.gz

# Prepare database
mkdir -p /app/jena/tdb_lov_db
cp /app/jena/config-lov.ttl /app/jena/jena-fuseki-1.1.1

# Load data into TDB
/app/jena/apache-jena-2.7.4/bin/tdbloader2 --loc /app/jena/tdb_lov_db /app/public/lov.nq

# Stop any running Fuseki
pkill -f fuseki-server || true

# Start Fuseki in background
nohup /app/jena/jena-fuseki-1.1.1/fuseki-server --desc /app/jena/jena-fuseki-1.1.1/config-lov.ttl /lov > /app/jena/jena-fuseki-1.1.1/fuseki.log 2>&1 &
