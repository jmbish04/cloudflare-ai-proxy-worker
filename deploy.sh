#!/bin/bash

# Cloudflare AI Proxy Worker Deployment Script
# This script helps deploy the worker and configure secrets

set -e

echo "🚀 Deploying Cloudflare AI Proxy Worker"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare first:"
    echo "wrangler login"
    exit 1
fi

echo "📝 Current Cloudflare account:"
wrangler whoami

# Build and deploy
echo "🔨 Building and deploying worker..."
npm run deploy

echo "✅ Worker deployed successfully!"

# Prompt for secrets configuration
echo ""
echo "🔑 Configure API keys (optional):"
echo "The worker can use multiple AI providers. Configure the ones you want to use:"

read -p "Do you want to configure OpenAI API key? (y/N): " configure_openai
if [[ $configure_openai =~ ^[Yy]$ ]]; then
    read -s -p "Enter your OpenAI API key: " openai_key
    echo ""
    echo "$openai_key" | wrangler secret put OPENAI_API_KEY
    echo "✅ OpenAI API key configured"
fi

read -p "Do you want to configure Gemini API key? (y/N): " configure_gemini
if [[ $configure_gemini =~ ^[Yy]$ ]]; then
    read -s -p "Enter your Gemini API key: " gemini_key
    echo ""
    echo "$gemini_key" | wrangler secret put GEMINI_API_KEY
    echo "✅ Gemini API key configured"
fi

read -p "Do you want to configure authentication token? (y/N): " configure_auth
if [[ $configure_auth =~ ^[Yy]$ ]]; then
    read -s -p "Enter your authentication token: " auth_token
    echo ""
    echo "$auth_token" | wrangler secret put AUTH_TOKEN
    echo "✅ Authentication token configured"
fi

# Optional D1 database setup
read -p "Do you want to set up D1 database for logging? (y/N): " setup_d1
if [[ $setup_d1 =~ ^[Yy]$ ]]; then
    echo "Creating D1 database..."
    db_output=$(wrangler d1 create ai-proxy-logs --json)
    
    # Use jq for robust JSON parsing if available, fall back to grep/cut
    if command -v jq &> /dev/null; then
        db_id=$(echo "$db_output" | jq -r '.uuid')
    else
        echo "Warning: jq not found, using fallback parsing method"
        db_id=$(echo "$db_output" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [ -n "$db_id" ]; then
        echo "✅ D1 database created with ID: $db_id"
        echo ""
        echo "📝 Please update your wrangler.jsonc file with the following configuration:"
        echo ""
        echo "  \"d1_databases\": ["
        echo "    {"
        echo "      \"binding\": \"DB\","
        echo "      \"database_name\": \"ai-proxy-logs\","
        echo "      \"database_id\": \"$db_id\""
        echo "    }"
        echo "  ]"
        echo ""
        echo "After updating wrangler.jsonc, redeploy with: npm run deploy"
    else
        echo "❌ Failed to create D1 database"
    fi
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📡 Your AI proxy is now available."
echo "💡 Check your Cloudflare dashboard for the correct workers.dev URL."
echo ""
echo "🔍 Test endpoints (replace with your actual worker URL):"
echo "  Health check: https://your-worker-name.your-subdomain.workers.dev/health"
echo "  Model options: https://your-worker-name.your-subdomain.workers.dev/v1/model-options"
echo "  Route check: https://your-worker-name.your-subdomain.workers.dev/v1/route-check"
echo ""
echo "📚 See README.md for API usage examples"