# Stage 1: Build React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY src/WhitePad.Web/package*.json ./
RUN npm ci
COPY src/WhitePad.Web/ ./
# Build to an absolute path inside the container to avoid the '../WhitePad.Server/wwwroot'
# relative path failing when the parent directory doesn't exist in this layer
RUN npx tsc --noEmit && npx vite build --outDir /wwwroot --emptyOutDir

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/WhitePad.Server/ ./WhitePad.Server/
COPY --from=frontend /wwwroot ./WhitePad.Server/wwwroot/
WORKDIR /src/WhitePad.Server
RUN dotnet publish WhitePad.Server.csproj -c Release -o /publish

# Stage 3: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "WhitePad.Server.dll"]
