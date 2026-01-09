# Ontology Hub

A web application to **explore, search, and reuse RDF ontologies and vocabularies** (inspired by LOV), built with **Node.js**. It provides a catalog, advanced search, and integration with ingestion and metadata validation processes.

## 🚧 Project Status

Actively under development. The API and commands may change between minor versions.

---

## Table of Contents

- [Context and Purpose](#context-and-purpose)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Frontend with Pug (SSR)](#frontend-with-pug-ssr)
- [NPM Scripts](#npm-scripts)
- [API Examples](#api-examples)
- [Repository Structure](#repository-structure)
- [Ingestion and Indexing](#ingestion-and-indexing)
- [Docker Usage](#docker-usage)
- [Testing](#testing)
- [How to Contribute](#how-to-contribute)
- [Roadmap](#roadmap)
- [Acknowledgments and Funding](#acknowledgments-and-funding)
- [Authors and Contact](#authors-and-contact)
- [License](#license)

---

## Context and Purpose

**Ontology Hub** centralizes metadata for ontologies and vocabularies (RDF/OWL/RDFS/SKOS), making them easier to discover and reuse. It includes a catalog, faceted search, version views, and API endpoints for integration.

---

## Key Features

- 🔎 **Search and facets** by name, prefix, terms, author, license, topics (SKOS), etc.
- 📚 **Ontology catalog** with versions, changes, and documentation links.
- 🧩 **Prefix and URI resolution**.
- 🛠️ **Metadata ingestion** from RDF/JSON/TTL files.
- ⚡ **Indexing** in Elasticsearch for fast responses.
- 🔐 **REST API** for querying and exporting results (JSON/CSV/NDJSON).
- 📈 **Statistics** (vocabulary usage, classes/properties, popularity).

---

## Architecture

- **Backend:** Node.js + Express
- **Frontend:** Pug (SSR with Express)
- **Database:** MongoDB
- **Search Engine:** Elasticsearch

---

## Requirements

- **Node.js 18+** (20 LTS recommended)
- **npm** or **pnpm**
- **MongoDB 6+**
- **Elasticsearch 2.4+**
- **Apache Jena**
- **Python 3**

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ProyectoPIONERA/Ontology-Hub.git
   cd Ontology-Hub
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

---

## Configuration

Create a `.env` file in the root directory with variables like:

```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/ontologyhub
ES_NODE=http://localhost:9200
ES_USERNAME=elastic
ES_PASSWORD=changeme
ES_INDEX=vocabs
REDIS_URL=redis://localhost:6379
JWT_SECRET=please_change_me
ALLOW_ORIGIN=*
```

---

## Running the Application

```bash
npm start
```

---

## Repository Structure

```text
ontology-hub-node/
├── app/
│   ├── views/        # Pug templates
│   ├── public/       # Static assets
├── config/
├── scripts/
├── dockers/
├── jena/
├── lib/
├── setup/
├── versions/
├── vocommons/
├── server.js
├── Dockerfile
├── DockerfileELS
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Docker Usage

This project includes **Docker support** for quick setup and deployment.

### **1. Build and Run with Docker Compose**
```bash
docker-compose up --build
```
This will start:
- **Node.js app**
- **MongoDB**
- **Elasticsearch**
- Optional services like **Jena** if configured.

---

## Funding

This work has received funding from the PIONERA project (Enhancing interoperability in data spaces through artificial intelligence), a project funded in the context of the call for Technological Products and Services for Data Spaces of the Ministry for Digital Transformation and Public Administration within the framework of the PRTR funded by the European Union (NextGenerationEU)

<div align="center">
  <img src="Logos financiación.png" alt="Logos financiación" width="900" />
</div>

## License

Distributed under **Apache License 2.0**.
