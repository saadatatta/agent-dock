#!/bin/bash

# GitHub Agent Demo Script
# This script demonstrates the GitHub agent functionality

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is not installed. Please install it to parse JSON responses.${NC}"
        echo "On Mac: brew install jq"
        echo "On Ubuntu/Debian: sudo apt-get install jq"
        exit 1
    fi
}

# Function to execute a GitHub agent action
execute_agent() {
    local action=$1
    local params=$2
    
    echo -e "${GREEN}Executing action:${NC} $action"
    echo -e "${GREEN}Parameters:${NC} $params"
    
    response=$(curl -s -X POST "http://localhost:8000/api/v1/agents/1/execute" \
        -H "Content-Type: application/json" \
        -d "{
            \"action\": \"$action\",
            \"parameters\": $params
        }")
    
    echo -e "${GREEN}Response:${NC}"
    echo "$response" | jq '.'
    echo ""
}

# Main script
main() {
    check_jq
    
    print_header "GitHub Agent Demo"
    
    # Check if GitHub token is set
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}Warning: GITHUB_TOKEN environment variable is not set.${NC}"
        echo -e "Set it with: export GITHUB_TOKEN=your_personal_access_token"
        read -p "Continue anyway? (y/n) " continue_choice
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        echo -e "${GREEN}GitHub token is set.${NC}"
    fi
    
    # Get repository name from user
    read -p "Enter a GitHub repository (format: owner/repo): " repo
    if [ -z "$repo" ]; then
        repo="microsoft/vscode"
        echo -e "Using default repository: ${BLUE}$repo${NC}"
    fi
    
    # Demo 1: Get repositories
    print_header "Getting Repositories"
    execute_agent "get_repositories" "{\"per_page\": 3, \"sort_by\": \"updated\", \"sort_direction\": \"desc\"}"
    
    # Demo 2: List pull requests
    print_header "Listing Pull Requests for $repo"
    execute_agent "list_pull_requests" "{\"repo\": \"$repo\", \"state\": \"open\", \"per_page\": 3}"
    
    # Demo 3: Get PR details if there are PRs
    print_header "Getting PR Details"
    read -p "Enter a PR number from the repository (leave empty to skip): " pr_number
    if [ ! -z "$pr_number" ]; then
        execute_agent "get_pull_request_details" "{\"repo\": \"$repo\", \"number\": $pr_number}"
    else
        echo "Skipping PR details retrieval."
    fi
    
    print_header "Demo Complete"
    echo -e "For more examples, see ${BLUE}github_agent_examples.md${NC}"
}

# Run the main function
main 