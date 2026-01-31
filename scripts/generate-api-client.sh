#!/bin/bash

# Script to generate TypeScript API client from Swagger/OpenAPI specification
# This script should be run after starting the backend server

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/src/backend/MovieChecker.Web"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
SPEC_FILE="$FRONTEND_DIR/openapi.json"
OUTPUT_DIR="$FRONTEND_DIR/src/generated"

echo "📋 Generating API Client for MovieChecker Frontend"
echo "=================================================="

# Check if backend is running
BACKEND_URL="http://localhost:5000"
SWAGGER_URL="$BACKEND_URL/swagger/v1/swagger.json"

echo "✓ Downloading OpenAPI specification from $SWAGGER_URL..."
if ! curl -sf "$SWAGGER_URL" -o "$SPEC_FILE"; then
    echo "❌ Error: Could not download OpenAPI specification."
    echo "   Make sure the backend is running at $BACKEND_URL"
    echo "   You can start it with: cd $BACKEND_DIR && dotnet run"
    exit 1
fi

echo "✓ OpenAPI specification saved to $SPEC_FILE"

# Generate TypeScript client
echo "✓ Generating TypeScript API client..."
cd "$FRONTEND_DIR"
npx @openapitools/openapi-generator-cli generate \
    -i openapi.json \
    -g typescript-axios \
    -o src/generated \
    --additional-properties=supportsES6=true,withSeparateModelsAndApi=true,apiPackage=api,modelPackage=models

echo "✓ API client generated successfully in $OUTPUT_DIR"
echo "=================================================="
echo "✅ Done! You can now import and use the generated API client in your frontend code."
echo ""
echo "Example usage:"
echo "  import { DefaultApi } from '@/generated/api';"
echo "  const api = new DefaultApi();"
