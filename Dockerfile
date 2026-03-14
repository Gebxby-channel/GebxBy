# Stage 1: Build the application
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app
# Copy wrapper dan config gradle duluan biar cache-nya efisien
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
#Nambah itu doang kok

# Kasih izin eksekusi buat gradlew
RUN chmod +x gradlew

# Download dependencies (biar rebuild selanjutnya lebih cepet)
RUN ./gradlew dependencies --no-daemon

# Copy source code dan build
COPY src ./src
RUN ./gradlew clean bootJar --no-daemon

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine AS runner

# Sesuaikan user biar aman (non-root)
ARG USER_NAME=gebi_blog
ARG USER_UID=1000
ARG USER_GID=${USER_UID}

RUN addgroup -g ${USER_GID} ${USER_NAME} \
    && adduser -h /opt/app -D -u ${USER_UID} -G ${USER_NAME} ${USER_NAME}

USER ${USER_NAME}
WORKDIR /opt/app

# Copy JAR hasil build dari stage builder
# Nama JAR biasanya {nama_proyek}-0.0.1-SNAPSHOT.jar, kita rename jadi app.jar
COPY --from=builder --chown=${USER_UID}:${USER_GID} /app/build/libs/*.jar app.jar

# EXPOSE SESUAI PORT LU (9090)
EXPOSE 9090

ENTRYPOINT ["java", "-jar", "app.jar"]