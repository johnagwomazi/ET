# Events Frontend Foundation

This project contains the frontend foundation for a production-ready event management and ticketing SaaS.

The goal of this phase is structure, maintainability, and a clean architecture that can grow module by module.

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
- `src/context` - future React context providers.
- `src/hooks` - reusable hooks.
- `src/layouts` - public, auth, and dashboard layout shells.
- `src/pages` - page components.
- `src/routes` - route configuration and route guards.
- `src/services` - feature-oriented service modules that call the API layer.
- `src/store` - Zustand stores.
- `src/styles` - global styles and Tailwind entry styles.
- `src/utils` - shared helper functions.
- `src/components/layout` - guest navigation, auth promo panels, and reusable auth scaffolding.

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

Important variables:

- `VITE_API_URL`
- `VITE_APP_NAME`
- `VITE_APP_ENV`

Current API base:

- `http://localhost:5000/api`

## Coding Standards

This frontend follows the project standards and keeps the codebase readable:

- One responsibility per component.
- Pages compose components instead of containing business logic.
- Fetch is used through a dedicated API layer.
- Zustand is used for global client state.
- Utility classes handle styling.
- Comments explain why, not what.

## State Management

Zustand is prepared for future global client state.

Keep local UI state inside components when possible.

Avoid creating stores unless the state must be shared.

## Routing Strategy

React Router is configured with route shells that can later support:

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
- `/customer/dashboard`
- `/organization/dashboard`
- `/manager/dashboard`
- `/super-admin/dashboard`

The current setup is intentionally minimal and ready to expand.

## Styling Approach

Tailwind CSS is configured properly through Vite and PostCSS.

The project uses:

- `src/styles/index.css` for global base styles
- Utility classes for component styling
- Shared spacing and layout conventions

## Current Foundation

This scaffold includes:

- Vite + React setup
- Tailwind CSS setup
- Fetch API service layer
- Zustand store foundation
- Reusable layout shells
- Generic UI primitives
- Route guard scaffolding
- Toast support
- Placeholder pages for a clean starting point
- Authentication and organization registration foundation
