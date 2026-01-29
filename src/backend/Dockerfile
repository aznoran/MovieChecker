FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Копируем csproj-файлы (и при необходимости solution), чтобы restore кэшировался корректно
COPY MovieChecker.Web/MovieChecker.Web.csproj MovieChecker.Web/
COPY MovieChecker.Infrastructure/MovieChecker.Infrastructure.csproj MovieChecker.Infrastructure/
COPY MovieChecker.Domain/MovieChecker.Domain.csproj MovieChecker.Domain/

# Если у вас есть .sln в корне build-контекста, можно раскомментировать:
# COPY MovieChecker.sln ./

RUN dotnet restore MovieChecker.Web/MovieChecker.Web.csproj

# Копируем весь исходный код
COPY . .

# Публикуем веб-проект
RUN dotnet publish MovieChecker.Web/MovieChecker.Web.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "MovieChecker.Web.dll"]