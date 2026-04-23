# Maven + Java içeren bir temel imaj kullan
FROM maven:3.8-openjdk-17 AS build

# Uygulama kodunu kopyala
COPY . /app
WORKDIR /app

# .jar dosyasını üret
RUN mvn clean package -DskipTests

# Daha hafif bir Java imajına geç
FROM eclipse-temurin:17-jre-jammy

# .jar dosyasını kopyala
COPY --from=build /app/target/message-0.0.1-SNAPSHOT.jar app.jar

# Uygulamayı başlat
ENTRYPOINT ["java", "-jar", "/app.jar"]