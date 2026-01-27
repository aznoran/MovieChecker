FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

COPY MovieChecker.Api/MovieChecker.Api.csproj MovieChecker.Api/
RUN dotnet restore MovieChecker.Api/MovieChecker.Api.csproj

COPY MovieChecker.Api/ MovieChecker.Api/
RUN dotnet publish MovieChecker.Api/MovieChecker.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "MovieChecker.Api.dll"]
