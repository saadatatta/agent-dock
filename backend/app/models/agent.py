from sqlalchemy import Column, Integer, String, JSON, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

# Define the many-to-many relationship table
agent_tools = Table(
    'agent_tools',
    Base.metadata,
    Column('agent_id', Integer, ForeignKey('agents.id'), primary_key=True),
    Column('tool_id', Integer, ForeignKey('tools.id'), primary_key=True)
)

class Agent(Base, TimestampMixin):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    code = Column(String, nullable=False)  # Python code for the agent
    config = Column(JSON)  # Agent configuration
    is_active = Column(Boolean, default=True)
    tools = relationship("Tool", secondary=agent_tools, back_populates="agents") 