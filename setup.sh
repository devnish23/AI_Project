#!/bin/bash

echo "🚀 Setting up Infra Tracker - Infrastructure Management System"
echo "================================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed. Please install MongoDB v4.4 or higher."
    echo "   You can download it from: https://www.mongodb.com/try/download/community"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd client
npm install
cd ..

echo "🔧 Creating environment file..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Environment file created. Please update .env with your configuration."
else
    echo "✅ Environment file already exists."
fi

echo "🗄️  Setting up database indexes..."
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/infra-tracker')
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Create indexes
    const Application = require('./server/models/Application');
    const User = require('./server/models/User');
    const VendorPortal = require('./server/models/VendorPortal');
    
    Promise.all([
      Application.createIndexes(),
      User.createIndexes(),
      VendorPortal.createIndexes()
    ]).then(() => {
      console.log('Database indexes created successfully');
      process.exit(0);
    }).catch(err => {
      console.error('Error creating indexes:', err);
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start MongoDB if not already running"
echo "3. Run 'npm run dev' to start the application"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For more information, see README.md" 