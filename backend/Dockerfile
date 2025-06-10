# Maven + Java içeren bir temel imaj kullan
FROM maven:3.8-openjdk-17 as build

# Uygulama kodunu kopyala
COPY . /app
WORKDIR /app

# .jar dosyasını üret
RUN mvn clean package -DskipTests

# Daha hafif bir Java imajına geç
FROM openjdk:17-jdk-slim

# .jar dosyasını kopyala
COPY --from=build /app/target/chatapp-0.0.1-SNAPSHOT.jar app.jar

# Uygulamayı başlat
ENTRYPOINT ["java", "-jar", "/app.jar"]
