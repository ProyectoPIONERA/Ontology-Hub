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
RUN apt-get update && apt-get install -y git

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
RUN mkdir -p /maven-output/scripts

# Copy Maven build artifacts
RUN cp -r target/lovscripts-cli/lovscripts/* /maven-output/scripts/

# Copy lov.config from repo root
RUN cp lov.config /maven-output/scripts

# =========================
# Stage 2: Node + Java + Python
# =========================
FROM node:20 AS final

# Copy Maven artifacts into /app/scripts
COPY --from=maven_builder /maven-output/scripts /app/scripts

# Install JDK 8
#COPY --from=eclipse-temurin:8-jdk /opt/java/openjdk /opt/java/openjdk
#ENV JAVA_HOME=/opt/java/openjdk
#ENV PATH="$JAVA_HOME/bin:${PATH}"

# Install MongoDB tools and build essentials
RUN apt-get update && \
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add - && \
    echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" \
      | tee /etc/apt/sources.list.d/mongodb-org-6.0.list && \
    apt-get update && \
    apt-get install -y bash gnupg mongodb-org-tools vim wget curl build-essential \
       libssl-dev zlib1g-dev libncurses5-dev libncursesw5-dev libreadline-dev \
       libsqlite3-dev libgdbm-dev libdb5.3-dev libbz2-dev libexpat1-dev \
       liblzma-dev tk-dev uuid-dev libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Build Python 3.12
RUN curl -sS https://www.python.org/ftp/python/3.12.6/Python-3.12.6.tgz | tar xz && \
    cd Python-3.12.6 && \
    ./configure --enable-optimizations && \
    make -j$(nproc) && \
    make altinstall && \
    cd .. && rm -rf Python-3.12.6

# Symlinks for Python and pip
RUN ln -sf /usr/local/bin/python3.12 /usr/bin/python3 && \
    ln -sf /usr/local/bin/python3.12 /usr/bin/python && \
    ln -sf /usr/local/bin/pip3.12 /usr/bin/pip3 && \
    ln -sf /usr/local/bin/pip3.12 /usr/bin/pip

# Set working directory
WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install
RUN npm install n3
run npm install cors

# Copy application files
COPY . .

# Fix line endings and permissions for setup scripts
RUN sed -i 's/\x0D$//' ./setup/*.sh && chmod +x setup/*.sh

#Patrones
RUN mkdir -p  /app/Patterns/Patrones

ARG REPO_PATRONES

#CLonar proyecto
RUN git clone ${REPO_PATRONES} /app/Patterns/Patrones

# Keep the single-pattern modes compatible with GrOwEr's current
# generate_documentation signature (both image paths are required).
RUN sed -i \
      -e 's/images_path_name, images_path_name, images_path_type/images_path_name, images_path_type/' \
      -e 's/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_type, web_path, patterns_name_path, inferred_type_path)/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_name, images_path_type, web_path, patterns_name_path, inferred_type_path)/' \
      -e 's/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_name, web_path, patterns_name_path, inferred_type_path)/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_name, images_path_type, web_path, patterns_name_path, inferred_type_path)/' \
      /app/Patterns/Patrones/generate_web_page.py \
    && test "$(grep -c 'images_path_name, images_path_type, web_path, patterns_name_path' /app/Patterns/Patrones/generate_web_page.py)" -eq 3

# Install Python dependencies
RUN pip install -r /app/Patterns/Patrones/requirements.txt

RUN cp /app/config/config.example.js /app/config/config.js

RUN apt-get update && apt-get install -y openjdk-17-jre && rm -rf /var/lib/apt/lists/*

# Expose port and set entrypoint
EXPOSE 3000
ENTRYPOINT ["bash","./setup/start.sh"]

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:${PATH}"
