#!/bin/bash

# Deploy backend files to remote server using rsync
# Usage: ./deploy-backend.sh <server> <username> <remote_path>
# Example: ./deploy-backend.sh myserver.com ubuntu /home/ubuntu/mycomize-grow/backend

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if correct number of arguments provided
if [ $# -ne 3 ]; then
    print_error "Usage: $0 <server> <username> <remote_path>"
    print_error "Example: $0 myserver.com ubuntu /home/ubuntu/mycomize-grow/backend"
    exit 1
fi

# Parse arguments
SERVER="$1"
USERNAME="$2"
REMOTE_PATH="$3"

# Validate that we're in the correct directory (should contain backend folder)
if [ ! -d "backend" ]; then
    print_error "No 'backend' directory found in current working directory."
    print_error "Please run this script from the mycomize-grow root directory."
    exit 1
fi

print_info "Starting backend deployment..."
print_info "Server: $SERVER"
print_info "Username: $USERNAME"
print_info "Remote path: $REMOTE_PATH"

# Test SSH connection
print_info "Testing SSH connection to $USERNAME@$SERVER..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$USERNAME@$SERVER" echo "SSH connection successful" 2>/dev/null; then
    print_error "Cannot establish SSH connection to $USERNAME@$SERVER"
    print_error "Please check:"
    print_error "  1. Server is reachable"
    print_error "  2. SSH key is properly configured"
    print_error "  3. Username is correct"
    exit 1
fi

print_info "SSH connection successful!"

# Create remote directory if it doesn't exist
print_info "Ensuring remote directory exists..."
ssh "$USERNAME@$SERVER" "mkdir -p $(dirname "$REMOTE_PATH")"

# Rsync options explanation:
# -a: archive mode (preserves permissions, timestamps, etc.)
# -v: verbose output
# -z: compress data during transfer
# -h: human-readable output
# --delete: delete files on destination that don't exist in source
# --exclude: exclude specified patterns
RSYNC_OPTIONS="-avzh"

# Files and directories to exclude
EXCLUDES=(
    "--exclude=__pycache__/"
    "--exclude=*.pyc"
    "--exclude=*.pyo"
    "--exclude=.pytest_cache/"
    "--exclude=*.log"
    "--exclude=.env"
    "--exclude=.env.local"
    "--exclude=.DS_Store"
    "--exclude=Thumbs.db"
    "--exclude=alembic/versions/*.py"
    "--exclude=data/*"
    "--exclude=config/*"
    "--exclude=.coverage"
    "--exclude=.venv"
    "--exclude=htmlcov/"
)

print_info "Syncing backend files..."
print_warning "This will overwrite files on the remote server!"

# Perform the rsync
if rsync $RSYNC_OPTIONS "${EXCLUDES[@]}" backend/ "$USERNAME@$SERVER:$REMOTE_PATH/"; then
    print_info "Backend deployment completed successfully!"

    # Show what was transferred
    print_info "Files have been synced to: $USERNAME@$SERVER:$REMOTE_PATH"

    # Optional: restart services (commented out - uncomment if needed)
    # print_info "Restarting backend service..."
    # ssh "$USERNAME@$SERVER" "sudo systemctl restart mycomize-backend || true"

else
    print_error "Rsync failed!"
    exit 1
fi
