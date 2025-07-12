@echo off
echo 🚀 Starting REC-ONE Backend Server...
echo ================================

cd backend

echo 📋 Checking Node.js version...
node --version

echo 📋 Checking npm version...
npm --version

echo 📋 Installing dependencies...
npm install

echo 🔧 Setting environment variables...
set PORT=3002
set NODE_ENV=development

echo 🚀 Starting server...
npm start

pause
