#!/bin/bash

# Check if message argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a migration message as an argument"
    echo "Usage: ./migrate.sh \"your migration message\""
    exit 1
fi

MESSAGE="$1"

echo "🔄 Generating migration: $MESSAGE"

# Change to backend directory where alembic operations should run
cd backend

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "📦 Activating virtual environment..."
    source .venv/bin/activate
fi

# Generate migration
echo "📝 Creating migration file..."
alembic revision --autogenerate -m "$MESSAGE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate migration"
    exit 1
fi

echo "✅ Migration generated successfully"

# Apply migration
echo "🚀 Applying migration to database..."
alembic upgrade head

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply migration"
    exit 1
fi

echo "✅ Migration applied successfully"
echo "🎉 Database migration completed!"
