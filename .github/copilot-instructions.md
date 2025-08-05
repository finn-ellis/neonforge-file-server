<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# NeonBrush File Server - Copilot Instructions

## Project Overview
This is a containerized file server application built with:
- **Frontend**: React TypeScript with Vite
- **Backend**: Node.js Express with TypeScript
- **Containerization**: Docker with docker-compose

## Architecture
- Frontend runs on port 3000 (production) / 5173 (development)
- Backend API runs on port 3001
- File uploads are stored in a Docker volume
- CORS is configured for frontend-backend communication

## Development Guidelines
1. Use TypeScript for type safety
2. Follow React hooks patterns for state management
3. Use proper error handling for file operations
4. Maintain RESTful API design patterns
5. Use environment variables for configuration

## Key Components
- File listing and management
- User-flow for requesting files via email
- Backend for queueing emails to be sent later
- Responsive design with gradient styling

## Docker Commands
- Development: `docker-compose -f docker-compose.dev.yml up`
- Production: `docker-compose up`
- Build: `docker-compose build`

## API Endpoints
- GET /api/health - Health check
- GET /api/files - List all files
- POST /api/upload - Upload a file
- GET /api/files/:filename - Download a file
- DELETE /api/files/:filename - Delete a file
