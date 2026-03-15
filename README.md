# Expense Management System

A full-stack expense management platform built for Odoo Hackathon 2025.

It includes expense submission, receipt upload, role-based approvals, multi-company support, currency conversion, and reporting APIs.

## Table Of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Run Commands](#run-commands)
- [API Surface](#api-surface)
- [Authentication And Authorization](#authentication-and-authorization)
- [Current Status](#current-status)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

This is a monorepo with:

- `frontend/`: Next.js + TypeScript client app
- `backend/`: Express + Sequelize REST API
- `MySQL`: primary relational database

The frontend communicates with backend APIs through Next.js API proxy routes and backend REST endpoints.

## Core Features

- Expense creation, edit, delete, and submission workflow
- Receipt upload support for expenses
- Role-based access control (`admin`, `manager`, `employee`)
- Multi-tenant model using company-scoped data
- Approval queues with approve/reject/delegate actions
- Bulk approval action endpoint
- Currency metadata and conversion endpoints with cache utilities
- Dashboard and report endpoints (analytics/export hooks included)
- Security middleware (Helmet, CORS, rate limiting, validation)

## Architecture

```text
Frontend (Next.js)
	|
	|  /api/* proxy
	v
Backend (Express REST API)
	|
	v
MySQL (Sequelize ORM models + associations)
```

## Tech Stack

### Frontend

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state)
- Axios (HTTP)
- React Query + chart libraries

### Backend

- Node.js + Express
- Sequelize + mysql2
- JWT authentication
- express-validator + Joi
- multer (file upload)
- express-rate-limit

## Repository Structure

```text
Expense_Management/
├─ frontend/
│  ├─ src/pages/           # App pages + API proxy routes
│  ├─ src/components/      # UI and feature components
│  ├─ src/services/        # Frontend service layer
│  └─ src/store/           # Zustand auth store
├─ backend/
│  ├─ src/controllers/     # Route handlers
│  ├─ src/routes/          # API route modules
│  ├─ src/models/          # Sequelize models + relations
│  ├─ src/middleware/      # Auth, validation, rate limiting
│  ├─ src/services/        # Currency/external integrations
│  └─ uploads/             # Uploaded receipts/files
├─ API_SETUP.md
├─ SETUP_GUIDE.md
└─ README.md
```

## Quick Start

### 1) Prerequisites

- Node.js 18+
- npm 9+
- MySQL 8+

### 2) Install dependencies

From the repository root:

```bash
npm run install:all
```

### 3) Configure environment

- Copy and configure backend env file:

```bash
cp backend/.env.example backend/.env
```

- Copy and configure frontend env file:

```bash
cp frontend/.env.example frontend/.env.local
```

### 4) Start development servers

From the repository root:

```bash
npm run dev:full
```

App URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Environment Variables

### Backend required (minimum)

Set these in `backend/.env`:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`

Important note:

- Backend code reads `DB_USER`.
- `backend/.env.example` currently shows `DB_USERNAME`.
- Use `DB_USER` in your actual `.env` to avoid fallback/default DB user issues.

### Frontend commonly used

Set these in `frontend/.env.local`:

- `NEXT_PUBLIC_API_URL`
- `BACKEND_URL` (used by Next.js API proxy routes)
- `NEXT_PUBLIC_API_TIMEOUT`

## Run Commands

### Root commands

- `npm run dev:full` - run frontend + backend in parallel
- `npm run dev:backend` - run backend only
- `npm run dev:frontend` - run frontend only
- `npm run start:full` - start both in production mode
- `npm run install:all` - install all dependencies

### Backend commands

- `npm run dev` - run backend with nodemon
- `npm run start` - run backend with node
- `npm run test` - run backend tests

### Frontend commands

- `npm run dev` - run Next.js dev server
- `npm run build` - production build
- `npm run start` - start built app
- `npm run lint` - lint code

## API Surface

Base URL: `/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/profile`
- `POST /auth/change-password`
- `POST /auth/logout`

### Users

- `GET /users`
- `GET /users/hierarchy`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

### Companies

- `GET /companies`
- `PUT /companies/:id`
- `GET /companies/stats`
- `GET /companies/categories`
- `POST /companies/categories`

### Expenses

- `GET /expenses/stats`
- `GET /expenses/categories`
- `GET /expenses`
- `GET /expenses/:id`
- `POST /expenses`
- `PUT /expenses/:id`
- `DELETE /expenses/:id`
- `POST /expenses/:id/receipt`
- `POST /expenses/:id/submit`

### Approvals

- `GET /approvals/stats`
- `GET /approvals`
- `GET /approvals/:id`
- `POST /approvals/:id/approve`
- `POST /approvals/:id/reject`
- `POST /approvals/:id/delegate`
- `POST /approvals/bulk/approve`

### Currency + Conversion

- `GET /currencies/countries`
- `GET /currencies/list`
- `GET /currencies/popular`
- `GET /currencies/:code`
- `GET /currencies/:code/countries`
- `GET /currencies/countries/search`
- `DELETE /currencies/cache`
- `GET /currencies/cache/info`

- `GET /conversion/rates/:baseCurrency?`
- `POST /conversion/convert`
- `POST /conversion/convert-multiple`
- `GET /conversion/currencies/:baseCurrency?`
- `GET /conversion/cache/info`
- `DELETE /conversion/cache/:baseCurrency?`
- `GET /conversion/quick/:amount/:from/:to`

### Reports + External

- `GET /reports/dashboard`
- `GET /reports/expenses`
- `GET /reports/export`
- `GET /reports/analytics`

- `GET /external/countries`
- `GET /external/currencies`
- `GET /external/exchange-rates/:currency`
- `GET /external/convert`

## Authentication And Authorization

- JWT is used for authenticated endpoints.
- Include token in `Authorization: Bearer <token>` header.
- Role checks are enforced in middleware for admin/manager-only operations.

## Current Status

- Core auth, users, companies, expenses, approvals, and currency endpoints are implemented.
- Frontend dashboard page currently uses mock summary values for visual stats display.
- OCR and some external integrations require valid provider API keys in environment variables.

## Troubleshooting

- `npm run dev` fails in repository root: use `npm run dev:full`.
- `429 Too Many Requests` on auth endpoints: wait for limiter window or adjust development limits.
- DB connection issue: confirm `DB_USER` is set and MySQL is running.
- Frontend cannot reach backend: verify `BACKEND_URL` and backend server port.

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push your branch: `git push origin feature/your-feature`
5. Open a pull request

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Support

- Issues: [GitHub Issues](https://github.com/Shubham02-git/Expense_Management/issues)

If this project helped you, consider starring the repository.