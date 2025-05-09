# AgentDock - Multi-Agent MCP Server with UI & Tool Integrations

AgentDock is a Model Context Protocol (MCP) server that enables multi-agent orchestration, tool integrations, and LLM-powered interactions through a clean web interface.

## Features

- 🤖 Multi-Agent Support
- 💬 Natural Language Interface using Groq
- 🛠️ Tool Integrations (GitHub, Slack, Jira, etc.)
- 📊 Real-time Monitoring & Logs
- 🎯 REST API for Tool Registration
- 🎨 Clean & Intuitive UI

## Tech Stack

- **Backend**: Python (FastAPI)
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **LLM Integration**: Groq
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js (v16 or higher)
- Python 3.9+
- Git

## Quick Start

1. Clone the repository:
```bash
git clone <your-repo-url>
cd agent-dock
```

2. Start the application using Docker Compose:
```bash
docker-compose up --build
```

3. Setup the database with necessary initial data:
```bash
./setup_db.sh
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
agent-dock/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core functionality
│   │   ├── models/         # Database models
│   │   └── services/       # Business logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Detailed Architecture

### Backend Architecture

The backend follows a modular, layered architecture designed for extensibility and MCP compliance:

#### 1. API Layer (`app/api/`)
- **REST Endpoints**: Organized by resource type (agents, tools, settings)
- **Input Validation**: Using Pydantic schemas for request/response validation
- **Error Handling**: Consistent error responses with appropriate HTTP status codes

#### 2. Service Layer (`app/services/`)
- **Business Logic**: Core application functionality isolated from API concerns
- **Modular Services**:
  - `agent_service.py`: Agent management and execution logic
  - `tool_service.py`: Tool registration and execution (GitHub, Slack, Jira)
  - `nl_service.py`: Natural language processing with multi-LLM support
  - `settings_service.py`: Application configuration management

#### 3. Data Layer (`app/models/`)
- **SQLAlchemy Models**: Database entity definitions
- **Relationships**: Many-to-many agent-tool relationships
- **Base Models**: Common functionality like timestamps shared across entities

#### 4. Core Components (`app/core/`)
- **Database Configuration**: Connection management and session handling
- **Environment Settings**: Application settings from environment variables
- **Schema Definitions**: Data transfer objects using Pydantic

### MCP Implementation

AgentDock follows the Model Context Protocol for agent orchestration:

1. **Multi-Model Support**:
   - Seamless switching between LLM providers (Groq, OpenAI, Anthropic)
   - Consistent interface across different models
   - Runtime model selection based on application settings

2. **Agent Execution Environment**:
   - Sandboxed Python execution context for agent code
   - Standardized tool access pattern via `execute_tool`
   - Dynamic parameter handling and result processing

3. **Natural Language Processing**:
   - Context-aware query processing
   - Intent detection for routing to appropriate agents
   - Parameter extraction from natural language

### Frontend Architecture

The React frontend uses a component-based architecture:

1. **Component Structure**:
   - Reusable UI components for consistent design
   - Page components for different application views
   - Modal components for interactive dialogs

2. **State Management**:
   - React hooks for local component state
   - Context API for global application state
   - Prop drilling minimized through proper component hierarchy

3. **API Integration**:
   - Service modules for backend communication
   - TypeScript interfaces for type safety
   - Consistent error handling and loading states

### Tool Integration System

The tool integration system is designed for extensibility:

1. **Tool Registration**:
   - REST API for registering new tools
   - Configuration validation and storage
   - Credential management

2. **Tool Execution**:
   - Type-specific execution handlers
   - Parameter validation and transformation
   - Consistent error handling and logging

3. **Tool-Agent Binding**:
   - Many-to-many relationship between tools and agents
   - Dynamic tool discovery during agent execution
   - Runtime access control based on bindings

## Development Setup

### Backend

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the development server:
```bash
uvicorn app.main:app --reload
```

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## Database Management

### Resetting and Setting up the Database

If you need to reset the database and populate it with necessary initial data:

```bash
# From the project root
./setup_db.sh
```

This script will:
1. Reset the database (drop all tables and recreate them)
2. Create required tools (GitHub API, Slack API, Jira API, etc.)
3. Create default agents and link them to appropriate tools
4. Add required settings entries

### Manual Database Operations

If you need to perform manual operations:

```bash
# Reset database only (drop all tables and recreate them)
docker exec -it agent-dock-backend python /app/reset_db.py

# Initialize database schema without dropping tables
docker exec -it agent-dock-backend python /app/init_db.py
```

## Environment Variables
