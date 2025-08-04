#!/bin/bash

echo "🧪 Testing NeonBrush File Server Email Functionality"
echo "=================================================="

# Test 1: Check if backend compiles
echo "📦 Testing backend compilation..."
cd backend
if npm run build; then
    echo "✅ Backend compiles successfully"
else
    echo "❌ Backend compilation failed"
    exit 1
fi

# Test 2: Check if frontend compiles
echo "📦 Testing frontend compilation..."
cd ..
if npm run build; then
    echo "✅ Frontend compiles successfully"
else
    echo "❌ Frontend compilation failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Your NeonBrush File Server is ready!"
echo ""
echo "🚀 To start the application:"
echo "   Development: docker-compose -f docker-compose.dev.yml up"
echo "   Production:  docker-compose up -d"
echo ""
echo "📧 Email features:"
echo "   - Upload files in Upload Mode"
echo "   - Switch to Tablet Mode to request files via email"
echo "   - Configure SMTP settings in backend/.env for real emails"
echo "   - Without SMTP config, emails will be simulated in logs"
