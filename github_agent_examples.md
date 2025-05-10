# GitHub Agent Usage Examples with cURL

This document provides examples of how to use the GitHub agent with curl commands.

## Environment Setup

First, make sure the AgentDock backend is running:

```
docker-compose up -d
```

Set your GitHub token as an environment variable in your backend:

```
export GITHUB_TOKEN=your_github_personal_access_token
```

## GitHub Agent Examples

### List Repositories

```bash
curl -X POST "http://localhost:8000/api/v1/agents/1/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_repositories",
    "parameters": {
      "per_page": 5,
      "sort_by": "updated",
      "sort_direction": "desc"
    }
  }'
```

### List Pull Requests for a Repository

```bash
curl -X POST "http://localhost:8000/api/v1/agents/1/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_pull_requests",
    "parameters": {
      "repo": "owner/repo",
      "state": "open",
      "sort_by": "created",
      "direction": "desc"
    }
  }'
```

### Get Pull Request Details

```bash
curl -X POST "http://localhost:8000/api/v1/agents/1/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_pull_request_details",
    "parameters": {
      "repo": "owner/repo",
      "number": 123
    }
  }'
```

## GitHub Tool Direct Usage Examples

### Fetch Repositories Directly Using the Tool

```bash
curl -X POST "http://localhost:8000/api/v1/tools/1/github/get_repos" \
  -H "Content-Type: application/json" \
  -d '{
    "per_page": 5,
    "sort_by": "updated",
    "sort_direction": "desc"
  }'
```

### List Pull Requests Directly Using the Tool

```bash
curl -X POST "http://localhost:8000/api/v1/tools/1/github/list_pull_requests" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "owner/repo",
    "state": "open"
  }'
```

### Get Pull Request Details Directly Using the Tool

```bash
curl -X POST "http://localhost:8000/api/v1/tools/1/github/get_pr_details" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "owner/repo",
    "number": 123
  }'
```

## Notes

- Replace `owner/repo` with an actual GitHub repository (e.g., `microsoft/vscode`)
- Replace pull request `number` with an actual PR number from the repository
- The GitHub agent ID is `1` assuming it's the first agent created in your database. Adjust if necessary.
- The GitHub tool ID is `1` assuming it's the first tool created in your database. Adjust if necessary. 