from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from app.api.v1 import agents, tools, nl, settings as settings_router, chat
from app.core.database import engine, Base, init_models
from app.models import agent, tool, settings as settings_model, chat as chat_model  # Import models to ensure they are registered with Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up AgentDock server...")
    # Initialize models
    init_models()
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")
    yield
    # Shutdown
    logger.info("Shutting down AgentDock server...")

app = FastAPI(
    title="AgentDock",
    description="Multi-Agent MCP Server with UI & Tool Integrations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(tools.router, prefix="/api/v1/tools", tags=["Tools"])
app.include_router(tools.logs_router, prefix="/api/v1/logs", tags=["Logs"])
app.include_router(nl.router, prefix="/api/v1/nl", tags=["Natural Language"])
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["Settings"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])

@app.get("/")
async def root():
    return JSONResponse(
        content={
            "message": "Welcome to AgentDock API",
            "status": "operational",
            "version": "1.0.0"
        }
    )

@app.get("/health")
async def health_check():
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "AgentDock API"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 