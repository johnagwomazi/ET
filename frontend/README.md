# Events Frontend

This is the Vite/React frontend for the event management and ticketing application.

## Architecture

The frontend is organized to keep concerns separated:

- Pages compose components.
- Layouts wrap groups of routes.
- Reusable UI lives in `components`.
- Network access goes through `api` and `services`.
- Global client state lives in `store`.
- Shared constants and helpers live in `constants` and `utils`.

## Project Structure

- `src/api` - fetch wrapper and request helpers.
- `src/assets` - logos, icons, and images.
- `src/components/common` - shared UI patterns such as loading and empty states.
- `src/components/layout` - layout-related UI pieces.
- `src/components/ui` - reusable generic UI elements.
- `src/components/forms` - form helpers and input wrappers.
- `src/constants` - shared constants such as roles and routes.
- `src/hooks` - reusable hooks.
- `src/layouts` - public, auth, and dashboard layout shells.
- `src/pages` - page components.
- `src/routes` - route configuration and route guards.
- `src/services` - feature-oriented service modules that call the API layer.
- `src/store` - Zustand stores.
- `src/styles` - global styles and Tailwind entry styles.
- `src/utils` - shared helper functions.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and update the values.

## Running the Project

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## Environment Variables

Required production variables:

- `VITE_API_URL`: absolute HTTPS backend API URL including `/api`, for example `https://events-api.onrender.com/api`.
- `VITE_APP_NAME`: public application name. Defaults to `Events`.

Only public browser configuration may use the `VITE_` prefix. Never place JWT, Paystack secret, SMTP, database, or Cloudinary secret values in frontend environment variables.

For local development, use:

```text
VITE_API_URL=http://localhost:5000/api
```

A production build fails when `VITE_API_URL` is missing, malformed, or points to localhost.

## Render Deployment

The repository-level `render.yaml` defines `events-web` as a Render static site with:

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Required environment variable: `VITE_API_URL`
- SPA rewrite: `/*` to `/index.html`

The rewrite is required so direct refreshes of `/events/...`, `/customer/...`, `/manager/...`, `/organization/...`, and `/super-admin/...` are served by React Router instead of returning a hosting-level 404.

Set `VITE_API_URL` to the deployed backend HTTPS URL before the first build. Add the deployed frontend origin to the backend `FRONTEND_URL` allowlist and use secure cross-site cookies when the services use different origins.

Deployment verification:

```bash
npm ci
npm run build
npm run preview -- --host 0.0.0.0
```

Verify `/`, a public event route, each role login, and direct refreshes of protected routes. Keep Paystack in test mode until checkout, backend verification, ticket issuance, and ticket display have completed successfully.

## Coding Standards

This frontend follows the project standards and keeps the codebase readable:

- One responsibility per component.
- Pages compose components instead of containing business logic.
- Fetch is used through a dedicated API layer.
- Zustand is used for global client state.
- Utility classes handle styling.
- Comments explain why, not what.

## State Management

Zustand stores shared session, organization, notification, and administrative state.

Keep local UI state inside components when possible.

Avoid creating stores unless the state must be shared.

## Routing Strategy

React Router is configured with route shells for:

- Public routes
- Protected routes
- Role-based routes

Current auth routes:

- `/`
- `/signup`
- `/register/customer`
- `/register/organizer`
- `/login`
- `/admin/login`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/customer/profile`
- `/customer/tickets`
- `/customer/history`
- `/organization/dashboard`
- `/manager/dashboard`
- `/super-admin/dashboard`

The public root always renders event discovery. Customers use the public layout, while Admin, Manager, and Super Admin areas use protected role-aware layouts. Super Admin authentication remains separate at `/admin/login`.

## Styling Approach

Tailwind CSS is configured properly through Vite and PostCSS.

The project uses:

- `src/styles/index.css` for global base styles
- Utility classes for component styling
- Shared spacing and layout conventions
