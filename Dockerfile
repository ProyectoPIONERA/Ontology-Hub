# Stage 1: Get Java 8
FROM eclipse-temurin:8-jdk AS jdk8

# Stage 2: Node.js base
FROM node:20

# Copy Java 8 from stage 1
COPY --from=jdk8 /opt/java/openjdk /opt/java/openjdk

ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
