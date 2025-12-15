#!/bin/bash

set -e

#echo "Esperando a MongoDB..." 
#until mongosh --host mongodb --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
#  sleep 2
#done

echo "MongoDB está listo."
echo "Ejecutando importToMongo.sh..."
/app/setup/importToMongo.sh

echo "Ejecutando scripts java"
#/app/setup/lovInitialization.sh

echo "Configurando Jena"
/app/setup/jena.sh

echo "Iniciando servidor Node..."
exec node server.js
