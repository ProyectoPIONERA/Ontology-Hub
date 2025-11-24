#!/bin/bash

set -e

echo "MongoDB está listo."
echo "Ejecutando importToMongo.sh..."
/app/setup/importToMongo.sh
echo "Ejecutando scripts java"
/app/setup/lovInitialization.sh
echo "Configurando Jena"
/app/setup/jena.sh
echo "Iniciando servidor Node..."
exec node server.js