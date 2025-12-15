# Ontology Hub

Aplicación web para **explorar, buscar y reutilizar ontologías y vocabularios RDF** (inspirada en LOV), desarrollada en **Node.js**. Proporciona catálogo, búsqueda avanzada e integración con procesos de ingesta y validación de metadatos.

## 🚧 Estado del Proyecto

Activamente en desarrollo. La API y los comandos pueden cambiar entre versiones menores.

---

## Tabla de Contenidos

- [Contexto y Propósito](#contexto-y-propósito)
- [Características Principales](#características-principales)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Frontend con Pug (SSR)](#frontend-con-pug-ssr)
- [Scripts NPM](#scripts-npm)
- [API (ejemplos)](#api-ejemplos)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Ingesta e Indexación](#ingesta-e-indexación)
- [Docker (opcional)](#docker-opcional)
- [Pruebas](#pruebas)
- [Cómo Contribuir](#cómo-contribuir)
- [Hoja de Ruta](#hoja-de-ruta)
- [Agradecimientos y Financiación](#agradecimientos-y-financiación)
- [Autores y Contacto](#autores-y-contacto)
- [Licencia](#licencia)

---

## Contexto y Propósito

**Ontology Hub** centraliza metadatos de ontologías y vocabularios (RDF/OWL/RDFS/SKOS), facilita su descubrimiento y promueve su reutilización. Incluye catálogo, facetas de búsqueda, vistas por versión y endpoints API para integraciones.

---

## Características Principales

- 🔎 **Búsqueda y facetas** por nombre, prefijo, términos, autor, licencia, temas (SKOS), etc.
- 📚 **Catálogo** de ontologías con versiones, cambios y enlaces a documentación.
- 🧩 **Resolución de prefijos** y URIs.
- 🛠️ **Ingesta** de metadatos desde archivos RDF/JSON/TTL o endpoints SPARQL.
- ⚡ **Indexación** en Elasticsearch para respuestas rápidas.
- 🔐 **API REST** para consultar y exportar resultados (JSON/CSV/NDJSON).
- 📈 **Estadísticas** (uso de vocabularios, clases/propiedades, popularidad).

---

## Arquitectura

- **Backend:** Node.js + Express.
- **Frontend:** Pug (SSR con Express).
- **Base de datos:** MongoDB.
- **Búsquedas:** Elasticsearch.

---

## Requisitos

- **Node.js 18+** (recomendado 20 LTS)
- **npm** o **pnpm**
- **MongoDB 6+**
- **Elasticsearch 2.4+**
- **Apache Jena**
- **Python 3**


---

## Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/ProyectoPIONERA/Ontology-Hub.git
   cd Ontology-Hub
   ```

2. Instala dependencias:

   ```bash
   npm install
   # o
   pnpm install
   ```

---

## Configuración

Crea un archivo `.env` en la raíz con variables como:

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

## Ejecución

```bash
npm run dev
npm run build
npm start
```

---

## API (ejemplos)

```http
GET /api/v1/vocabs?q=geo&license=cc-by
GET /api/v1/vocabs/:prefix
GET /api/v1/resolve?uri=http://schema.org/Person
```

---

## Estructura del Repositorio

```text
ontology-hub-node/
├── src/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── web/
│       ├── views/
│       └── public/
├── scripts/
├── tests/
├── docker/
└── package.json
```

---

## Licencia

Distribuido bajo **Apache License 2.0**.
