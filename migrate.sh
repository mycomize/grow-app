#!/bin/bash

# Check if message argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a migration message as an argument"
    echo "Usage: ./migrate.sh \"your migration message\""
    exit 1
fi

MESSAGE="$1"

echo "🔄 Generating migration: $MESSAGE"

# Activate virtual environment if it exists
if [ -d "backend/.venv" ]; then
    echo "📦 Activating virtual environment..."
    source backend/.venv/bin/activate
fi

# Generate migration
echo "📝 Creating migration file..."
alembic -c backend/alembic.ini revision --autogenerate -m "$MESSAGE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate migration"
    exit 1
fi

echo "✅ Migration generated successfully"

# Apply migration
echo "🚀 Applying migration to database..."
alembic -c backend/alembic.ini upgrade head

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply migration"
    exit 1
fi

echo "✅ Migration applied successfully"
echo "🎉 Database migration completed!"
