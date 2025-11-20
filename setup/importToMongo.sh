#!/bin/bash
set -e

mongoimport -h mongodb -d lov -c agents --file /app/setup/agents.json
mongoimport -h mongodb -d lov -c users --file /app/setup/users.json
mongoimport -h mongodb -d lov -c languages --file /app/setup/languages.json --jsonArray
mongoimport -h mongodb -d lov -c stattags --file /app/setup/stattags.json --jsonArray