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

3. Access the application:
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

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agentdock
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GITHUB_TOKEN=your_github_token
SLACK_TOKEN=your_slack_token
JIRA_TOKEN=your_jira_token
```

## API Documentation

Once the application is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 