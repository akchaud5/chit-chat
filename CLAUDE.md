# CLAUDE.md - Agent Guidance for Chit Chat

## Build Commands
- Backend: `npm start` (prod) or `npm run server` (dev with nodemon)
- Frontend: `cd frontend && npm start`
- Full app: `npm run build` (install deps + build frontend)

## Test Commands
- Frontend: `cd frontend && npm test`

## Codebase Structure
- Backend: Express/Node.js with MongoDB (Mongoose)
- Frontend: React 17 with Chakra UI
- Real-time: Socket.io for chat functionality

## Code Style
- Naming: camelCase for variables/functions, PascalCase for React components
- Backend: CommonJS imports (`require`), MVC pattern
- Frontend: ES6 imports, functional components with hooks
- Error handling: Express async handlers with middleware for backend
- API docs: Comments above controller functions

## Project Notes
- MongoDB connection string expected in `.env`
- JWT authentication with tokens in HTTP-only cookies
- Socket.io for real-time chat functionality