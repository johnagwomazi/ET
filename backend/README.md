# Events Backend Foundation

This project contains the backend foundation for a production-ready event management and ticketing SaaS.

The goal of this phase is structure, safety, and maintainability. Business features will be added later.

## Architecture

The codebase follows this flow:

`Controller -> Service -> Repository -> MongoDB`

Rules:

- Controllers receive requests and return responses.
- Services contain business logic.
- Repositories handle MongoDB queries only.
- Models contain Mongoose schemas only.
- Validators handle input validation only.

## Project Structure

- `src/config` - application, environment, database, security, CORS, cloudinary, and rate limit configuration.
- `src/constants` - shared application constants and role definitions.
- `src/controllers` - request handlers.
- `src/services` - business logic layer.
- `src/repositories` - database access layer.
- `src/routes` - route declarations.
- `src/middleware` - request logging, validation, 404 handling, and error handling.
- `src/models` - Mongoose models and schemas.
- `src/utils` - reusable helpers and error classes.
- `src/lib` - shared low-level helpers such as logging.
- `src/jobs` - future background jobs.
- `src/sockets` - future real-time socket handlers.
- `src/uploads` - upload-related storage workspace.
- `src/validators` - schema validators.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the values.

## Running the Server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Environment Variables

Important variables include:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_URL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `CLOUDINARY_*`
- `SMTP_*`
- `PAYSTACK_*`

## Development Workflow

1. Add a module under `controllers`, `services`, `repositories`, `models`, `routes`, and `validators` as needed.
2. Keep controllers thin.
3. Keep repositories focused on MongoDB queries.
4. Put business rules in services.
5. Keep response formats consistent.

## Coding Standards

This backend follows the standards in `standard.txt`:

- Readable code over clever code.
- Explicit logic over hidden logic.
- Early returns.
- `async/await` with `try/catch`.
- Consistent naming and formatting.
- Comments explain why, not what.

## Current Foundation

This scaffold includes:

- Express application setup
- MongoDB connection handling
- Security middleware
- CORS configuration
- Rate limiting
- Request logging
- Centralized error handling
- 404 handling
- Graceful shutdown
- A simple health endpoint for verification

## Authentication Foundation

Phase 1 adds the authentication and organization foundation for the multi-tenant SaaS.

Key parts:

- One `users` collection for all user types
- One `organizations` collection for tenant ownership
- Customer registration
- Organizer registration
- Customer, admin, and super admin login flows
- JWT-based auth middleware
- Role-based access middleware
- Organization scoping middleware foundation
- Email verification token storage
- Password reset token storage
- Password change support
- Super admin seeding from environment variables

## Role System

Supported roles:

- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`
- `CUSTOMER`

`GUEST` is not stored in the database.

## Organization Model

Organizations are created in pending state first.

The initial organizer flow creates:

- an organization record
- an admin user linked to that organization

Only approved organizations should publish events in later phases.

## Routing

Authentication routes are grouped under:

- `POST /api/auth/register/customer`
- `POST /api/auth/register/organizer`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PATCH /api/auth/change-password`

Super admin login:

- `POST /api/admin/login`
