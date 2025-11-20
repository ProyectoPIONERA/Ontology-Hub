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
    apt-get install -y mongodb-org-tools && \
    apt-get install -y wget gnupg bash && \
    rm -rf /var/lib/apt/lists/*


WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

RUN sed -i 's/\x0D$//' ./setup/*.sh && chmod +x setup/*.sh



EXPOSE 3000
ENTRYPOINT ["bash","./setup/start.sh"]
