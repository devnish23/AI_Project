up# Architecture

## System Overview

Infra Tracker is a full-stack MERN application with a React/TypeScript frontend, Node.js/Express backend, and MongoDB database. It integrates with external vendor portals for security advisories and supports file uploads, reporting, and scheduling.

## High-Level Diagram

```
flowchart TD
  User["User"] -->|UI| Frontend["React App"]
  Frontend -->|API| Backend["Express Server"]
  Backend -->|DB| MongoDB[("MongoDB")]
  Backend -->|Fetch/Scrape| Vendor["Vendor Portals"]
  Backend -->|File| FileSystem["File Storage"]
```

## Data Flow
- User interacts with the React frontend.
- Frontend communicates with backend via REST API.
- Backend handles authentication, business logic, and data storage.
- Backend fetches/scrapes vendor data via scripts/services.
- File uploads are processed and stored on the server.
- Reports are generated and returned to the frontend.

## Authentication & State Management
- JWT-based authentication (backend issues tokens, frontend stores them securely)
- Role-based access control (admin, user, etc.)
- Frontend uses React Context and Redux for state management

## Scheduling
- Backend scheduler runs periodic tasks (e.g., fetch vendor advisories)

## Error Handling & Logging
- Centralized error handling in backend
- Logging with Morgan and custom logic

## Security
- Input validation, CORS, Helmet, rate limiting, password hashing 