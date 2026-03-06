FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ContentSearch.Web/ContentSearch.Web.csproj ContentSearch.Web/
COPY ContentSearch.Infrastructure/ContentSearch.Infrastructure.csproj ContentSearch.Infrastructure/
COPY ContentSearch.Core/ContentSearch.Core.csproj ContentSearch.Core/
COPY ContentSearch.Domain/ContentSearch.Domain.csproj ContentSearch.Domain/

RUN dotnet restore ContentSearch.Web/ContentSearch.Web.csproj

COPY . .

RUN dotnet publish ContentSearch.Web/ContentSearch.Web.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ContentSearch.Web.dll"]
