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
- `NOTIFICATION_WORKER_ENABLED` enables the in-process 24-hour reminder and email retry worker.
- `PAYSTACK_*`

## Notification Worker

The notification worker runs every five minutes in the API process. Transactional notifications use unique database
deduplication keys and atomic email-delivery claims, so repeated webhooks, reminder scans, and multiple API instances do
not create duplicate records or send the same email concurrently. For deployments that separate web and worker
processes, set `NOTIFICATION_WORKER_ENABLED=false` on web-only instances and enable it on at least one worker-capable
instance.

## Development Workflow

1. Add a module under `controllers`, `services`, `repositories`, `models`, `routes`, and `validators` as needed.
2. Keep controllers thin.
3. Keep repositories focused on MongoDB queries.
4. Put business rules in services.
5. Keep response formats consistent.

## Production Verification

Run the regression suite before every deployment:

```bash
npm ci
npm test
NODE_ENV=production npm start
```

The production start command validates configuration before opening a database connection. The process exits instead
of starting with weak JWT secrets, insecure cookies, an invalid frontend origin, or missing Paystack, Cloudinary, and
SMTP configuration. `GET /api/health` returns HTTP 200 only after MongoDB is connected; otherwise it returns HTTP 503.

### Required Production Variables

- `MONGODB_URI`: production MongoDB connection string.
- `DNS_SERVERS`: optional comma-separated resolver override for local SRV lookup failures. Leave unset on Render unless required.
- `FRONTEND_URL`: one or more comma-separated allowed frontend origins. Never use `*` with credentials.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: different random values of at least 32 characters.
- `JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN`: normally `15m` and `7d`.
- `COOKIE_HTTP_ONLY=true`, `COOKIE_SECURE=true`, and `COOKIE_SAME_SITE=none` for a separately hosted HTTPS frontend.
- `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET`: backend-only keys from the same Paystack test or live mode.
- `PAYSTACK_TIMEOUT_MS`: provider request timeout between 1000 and 60000 milliseconds.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- `REQUIRE_EMAIL_VERIFICATION=true`.

Optional initial seed values are `SUPER_ADMIN_FIRST_NAME`, `SUPER_ADMIN_LAST_NAME`, `SUPER_ADMIN_EMAIL`, and
`SUPER_ADMIN_PASSWORD`. They are used only when that email does not already exist. Remove the seed password from the
service environment after the first verified startup.

### Render

The repository-level `render.yaml` uses `backend` as the service root, `npm ci` as the build command, `npm start` as
the start command, and `/api/health` as the health check. Add every `sync: false` value in the Render dashboard before
deploying. Render supplies `PORT`; the server does not hardcode a production port.

Configure the Paystack webhook as:

```text
https://YOUR_BACKEND_HOST/api/payments/paystack/webhook
```

Keep Paystack in test mode for deployment verification. A real test transaction must confirm that the provider amount,
currency, and reference exactly match the stored order before switching both backend keys and webhook configuration to
live mode.

Before enabling new unique payment/refund indexes against an existing database, take a backup and check for historical
duplicate non-empty references. Do not delete historical orders, tickets, attendance, refunds, or withdrawals to make
an index build pass.

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
