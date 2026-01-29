FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

COPY MovieChecker.Web/MovieChecker.Web.csproj MovieChecker.Web/
RUN dotnet restore MovieChecker.Web/MovieChecker.Web.csproj

COPY MovieChecker.Web/ MovieChecker.Web/
RUN dotnet publish MovieChecker.Web/MovieChecker.Web.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "MovieChecker.Web.dll"]
