# Multi-LLM Model Support Implementation

This document outlines the changes made to implement support for multiple LLM models in the AgentDock application.

## Backend Changes

1. **Models and Schemas**
   - Created a new `Settings` model in `backend/app/models/settings.py` to store system settings and LLM configuration
   - Created corresponding Pydantic schemas in `backend/app/schemas/settings.py` for API requests/responses
   - Added schemas for LLM model configuration management

2. **Settings Service**
   - Implemented `SettingsService` in `backend/app/services/settings_service.py` for managing application settings
   - Added methods for retrieving and updating LLM model configurations
   - Implemented functionality to set the active LLM model

3. **API Endpoints**
   - Created new API endpoints in `backend/app/api/v1/settings.py` for settings management
   - Added specific endpoints for LLM model management
   - Implemented routes for retrieving available models and setting the active model

4. **NL Service Update**
   - Modified `NaturalLanguageService` in `backend/app/services/nl_service.py` to support multiple LLM providers
   - Added support for OpenAI and Anthropic APIs alongside Groq
   - Implemented dynamic model selection based on the active model setting

5. **Configuration**
   - Updated `config.py` to include new environment variables for OpenAI and Anthropic API keys
   - Updated `docker-compose.yml` to expose the new environment variables
   - Added the new libraries to `requirements.txt`

## Frontend Changes

1. **API Types and Services**
   - Added new types for Settings and LLM models in `frontend/src/types/api.ts`
   - Extended the API service layer in `frontend/src/services/api.ts` with settings functionality

2. **Settings UI**
   - Created a new `Settings.tsx` component for the settings page
   - Implemented a tabbed interface with the LLM Models tab as the primary focus
   - Added UI for viewing and switching between different LLM models
   - Implemented visual indication of the active model

3. **App Integration**
   - Updated `App.tsx` to use the new Settings component
   - Replaced the placeholder settings page with the full implementation

## Deployment Changes

1. **Docker Configuration**
   - Updated `docker-compose.yml` to include new environment variables for API keys
   - Set default placeholder values for the new API keys

## How to Use

1. **Environment Variables**
   - Set the following environment variables in your environment or `.env` file:
     - `GROQ_API_KEY`: API key for Groq
     - `OPENAI_API_KEY`: API key for OpenAI
     - `ANTHROPIC_API_KEY`: API key for Anthropic

2. **Settings UI**
   - Navigate to the Settings page in the application
   - Use the "LLM Models" tab to view available models and select the active one
   - The system will automatically use the selected model for natural language processing

## Future Enhancements

1. **Additional LLM Providers**
   - The architecture supports adding more LLM providers in the future
   - Adding a new provider requires minimal changes to the `nl_service.py` file

2. **Model-Specific Settings**
   - The UI is prepared for displaying and configuring model-specific parameters
   - Future versions can expose more configuration options per model

3. **API Key Management**
   - A dedicated UI for managing API keys can be added to the Settings page
   - This would allow users to update API keys without restarting the application 