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