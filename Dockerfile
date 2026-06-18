# =========================
# Stage 1: Maven Build
# =========================
FROM maven:3.9.9-eclipse-temurin-8 AS maven_builder
WORKDIR /usr/src/app

# Build arguments for repo details
ARG REPO_URL
ARG BRANCH_NAME
ARG REPO_NAME

# Install git
RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/*

# Ensure REPO_NAME is set and remove any existing directory before cloning
RUN if [ -z "${REPO_NAME}" ]; then echo "REPO_NAME is not set" && exit 1; fi \
 && rm -rf "/usr/src/app/${REPO_NAME}" \
 && git config --global core.autocrlf false \
 && git config --global core.eol lf \
 && git clone --branch "${BRANCH_NAME}" "${REPO_URL}" "${REPO_NAME}"

# Set working directory to the cloned repo
WORKDIR /usr/src/app/${REPO_NAME}

RUN mkdir -p src/main/resources/queries/rdf2es

COPY dockers/scripts/lov.config .

# Run custom script
RUN sh createQueries.sh

# Build with Maven
RUN mvn clean package -DskipTests

# Prepare Maven output folder
RUN mkdir -p /maven-output/scripts \
 && cp -r target/lovscripts-cli/lovscripts/* /maven-output/scripts/ \
 && cp lov.config /maven-output/scripts


# =========================
# Stage 2: Node + Java + Python
# =========================
FROM node:20-bullseye

# ✅ instalar dependencias del sistema
RUN rm -rf /var/lib/apt/lists/* \
 && apt-get clean \
 && apt-get update --allow-releaseinfo-change \
 && apt-get install -y --no-install-recommends \
    debian-archive-keyring \
    python3 python3-pip \
    gnupg wget curl ca-certificates git \
    build-essential \
    python3-dev \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# ✅ instalar mongo tools (SIN apt, evita errores)
RUN wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-x86_64-100.9.4.tgz \
 && tar -xzf mongodb-database-tools-debian11-x86_64-100.9.4.tgz \
 && cp mongodb-database-tools-*/bin/* /usr/local/bin/ \
 && rm -rf mongodb-database-tools*

# ✅ Python usable
RUN ln -sf /usr/bin/python3 /usr/bin/python \
 && ln -sf /usr/bin/pip3 /usr/bin/pip

# Copy Maven artifacts into /app/scripts
COPY --from=maven_builder /maven-output/scripts /app/scripts

# Install JDK 8
COPY --from=eclipse-temurin:8-jdk /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"

# Set working directory
WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install \
 && npm install n3 cors

# Copy application files
COPY . .

# Fix scripts
RUN sed -i 's/\x0D$//' ./setup/*.sh \
 && chmod +x setup/*.sh

# Patrones
RUN mkdir -p /app/Patterns/Patrones

ARG REPO_PATRONES

# Clonar proyecto
RUN git clone ${REPO_PATRONES} /app/Patterns/Patrones

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/Patterns/Patrones/requirements.txt

# Config
RUN cp /app/config/config.example.js /app/config/config.js

# Expose port
EXPOSE 3333

ENTRYPOINT ["bash","./setup/start.sh"]

