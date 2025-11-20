#!/bin/bash

set -e

echo "MongoDB está listo."
echo "Ejecutando importToMongo.sh..."
/app/setup/importToMongo.sh
echo "Iniciando servidor Node..."
exec node server.js