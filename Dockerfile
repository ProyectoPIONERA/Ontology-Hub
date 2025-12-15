FROM eclipse-temurin:8-jdk AS jdk8

FROM node:20

COPY --from=jdk8 /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"

RUN apt-get update && \
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add - && \
    echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" \
      | tee /etc/apt/sources.list.d/mongodb-org-6.0.list && \
    apt-get update && \
    apt-get install -y bash gnupg mongodb-org-tools vim wget 

RUN apt-get update && \
    apt-get install -y bash gnupg vim wget curl build-essential \
       libssl-dev zlib1g-dev libncurses5-dev libncursesw5-dev libreadline-dev \
       libsqlite3-dev libgdbm-dev libdb5.3-dev libbz2-dev libexpat1-dev \
       liblzma-dev tk-dev uuid-dev libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Build Python
RUN curl -sS https://www.python.org/ftp/python/3.12.6/Python-3.12.6.tgz | tar xz && \
    cd Python-3.12.6 && \
    ./configure --enable-optimizations && \
    make -j$(nproc) && \
    make altinstall && \
    cd .. && rm -rf Python-3.12.6

# Symlinks
RUN ln -sf /usr/local/bin/python3.12 /usr/bin/python3 && \
    ln -sf /usr/local/bin/python3.12 /usr/bin/python && \
    ln -sf /usr/local/bin/pip3.12 /usr/bin/pip3 && \
    ln -sf /usr/local/bin/pip3.12 /usr/bin/pip

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

RUN sed -i 's/\x0D$//' ./setup/*.sh && chmod +x setup/*.sh

RUN pip install -r /app/Patterns/Patrones/requirements.txt


EXPOSE 3000
ENTRYPOINT ["bash","./setup/start.sh"]
