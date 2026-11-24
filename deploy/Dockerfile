FROM node:24-bookworm-slim AS frontend
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY frontend ./frontend
COPY tsconfig.json ./
RUN npm run build
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS backend
WORKDIR /src
COPY backend ./backend
RUN dotnet publish backend/GarminFaceCreator.Api.csproj -c Release -o /publish
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble
USER root
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless libfreetype6 fontconfig && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /publish ./
COPY --from=frontend /src/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080 GFC_DATA=/data/jobs GFC_SDK=/opt/connectiq GFC_KEY=/run/secrets/developer_key HOME=/home/app
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet","GarminFaceCreator.Api.dll"]