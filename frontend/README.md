# AgentDock Frontend

This is the frontend application for AgentDock, a platform for managing AI agents and tools.

## Features

- Manage AI agents with custom code and configurations
- Integrate with various tools (GitHub, Slack, Jira)
- Modern and responsive UI built with Material-UI
- TypeScript support for better development experience

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

The application will be available at http://localhost:3000.

## Development

- The application is built with React and TypeScript
- Material-UI is used for the component library
- React Router is used for navigation
- Axios is used for API communication

## Project Structure

```
src/
  ├── components/     # React components
  ├── services/       # API services
  ├── types/         # TypeScript type definitions
  ├── App.tsx        # Main application component
  └── index.tsx      # Application entry point
```

## Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 