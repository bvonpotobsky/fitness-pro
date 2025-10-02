# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 📘 Project: Fitness Plan App

## 🏗 Context

A Progressive Web Application (PWA) for fitness coaches and clients:

- **Coach** creates monthly plans, blocks, progressions, and microcycles
- **Client** receives the plan and provides feedback (execution, RPE, comments)
- **Plan Templates**: allows coaches to create base templates, duplicate them, and assign them to multiple clients

The project runs on the **T3 Stack**:

- Next.js (App Router)
- Prisma + MySQL
- Better Auth
- TailwindCSS
- tRPC (internal endpoints)
- Deployed on Vercel (dev/prod)

## 🛠 Development Commands

**Package Manager**: This project uses `pnpm` as the package manager.

### Core Commands
- `pnpm dev` - Start development server with Turbo (http://localhost:3000)
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm preview` - Build and start production server locally

### Code Quality
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint and auto-fix issues
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check` - Run both linting and type checking
- `pnpm format:check` - Check code formatting with Prettier
- `pnpm format:write` - Format code with Prettier

### Database (Prisma)
- `pnpm db:generate` - Generate Prisma client and run migrations in dev
- `pnpm db:push` - Push schema changes to database without migrations
- `pnpm db:migrate` - Deploy migrations to production database
- `pnpm db:studio` - Open Prisma Studio GUI (database browser)
- `pnpm db:seed` - Seed the database with demo data

**Note**: After pulling schema changes, run `pnpm db:generate` to update the Prisma client.

## 🏛 Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router (pages and API routes)
│   ├── api/
│   │   ├── auth/          # Better Auth API routes
│   │   └── trpc/          # tRPC HTTP handler
│   ├── auth/              # Authentication pages
│   └── _components/       # Page-specific components
├── lib/                   # Shared utilities and configurations
│   ├── auth.ts           # Better Auth configuration
│   └── auth-client.ts    # Better Auth client
├── server/               # Server-side code
│   ├── api/
│   │   ├── routers/      # tRPC route handlers (currently empty)
│   │   ├── root.ts       # tRPC router composition
│   │   └── trpc.ts       # tRPC initialization and middleware
│   └── db.ts            # Prisma client singleton
├── trpc/                # tRPC client setup
│   ├── query-client.ts  # React Query configuration
│   ├── react.tsx        # tRPC React hooks
│   └── server.ts        # Server-side tRPC caller
├── styles/              # Global styles
└── env.js              # Environment variable validation (@t3-oss/env-nextjs)
```

### tRPC Setup

The application uses tRPC for type-safe API endpoints:

- **Server**: Define routers in `src/server/api/routers/` and compose them in `src/server/api/root.ts`
- **Client**: Use `api` from `src/trpc/react.tsx` in client components
- **Server Components**: Use `api` from `src/trpc/server.ts` in server components
- **Procedures**:
  - `publicProcedure` - Available to all users (authenticated or not)
  - `protectedProcedure` - Requires authentication (throws UNAUTHORIZED if not logged in)

Example router pattern:
```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const exampleRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) => {
    // ctx.session.user is guaranteed to exist
    // ctx.db is the Prisma client
    return ctx.db.example.findMany();
  }),
});
```

### Authentication

- **Library**: Better Auth (v1.3.24)
- **Configuration**: `src/lib/auth.ts`
- **Providers**: Email/Password and Google OAuth
- **Session Access**: Available in tRPC context via `ctx.session`
- **Client Usage**: Import from `src/lib/auth-client.ts`

### Environment Variables

Environment variables are validated using `@t3-oss/env-nextjs` in `src/env.js`:

- `DATABASE_URL` - MySQL connection string (required)
- `BETTER_AUTH_SECRET` - Auth secret (required in production)
- `BETTER_AUTH_URL` - Base URL (default: http://localhost:3000)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth credentials (optional)

Copy `.env.example` to `.env` and populate with your values.

## 🔑 Technical Decisions

### Database (Prisma + MySQL)

- **Authentication**: `User`, `Account`, `Session`, `Verification` models (better-auth)
- **Roles**: `Coach`, `Client` (1:1 extending `User`)
- **Catalogs**: `Exercise`, `Section`, `ProgressionType`, `Tag`
- **Client Plans Hierarchy**:
  - `Plan → PlanDay → PlanDaySection → Block → BlockExercise → Microcycle`
- **Plan Templates Hierarchy** (base plans):
  - `PlanTemplate → TemplateDay → TemplateDaySection → TemplateBlock → TemplateBlockExercise → TemplateMicrocycle`
- **Name Snapshotting**: e.g., `sectionNameSnapshot` in sections to preserve historical names
- **Configurable Colors**: in `ProgressionType` for visual plan differentiation
- **Constraints**: `unique(planId, dayIndex)`, `unique(blockExerciseId, microIndex)`, etc.

Key Enums:
- `MmAxis`: MMSS, MMII, Mixto (muscle group classification)
- `BlockType`: series, superset, triset, circuit
- `PlanStatus`: draft, published, archived
- `PlanVisibility`: private, shared, public

### API Layer

- **tRPC** for internal endpoints (authenticated)
- **Public REST** for sharing plans with `shareToken`
- **Validation** with Zod on inputs
- **Key Endpoints**:
  - `plans.create`, `plans.get`, `plans.publish`, `plans.duplicate`
  - `plans.fromTemplate`
  - CRUD operations for days/sections/blocks/exercises/progressions

### Authentication

- **Better-auth** with Prisma adapter
- **RBAC** via `role` and profile existence (`Coach` or `Client`)
- **Public Sharing**: `share_tokens` table with `expiresAt` and `scopes`

### UI/UX

- **Visual Plan Editor**:
  - **Coach**: Desktop-focused application with full mobile feature parity
  - **Client**: Mobile-focused application
  - **Hierarchical Navigation**: Day → Section → Block → Exercise
  - **Drag & Drop** with `sortOrder`
- **Client View**: Simple plan display, progression colors, contextual glossary
- **Export**: Server-side PDF generation

## 🔒 Security

### Role-Based Access Control (RBAC)

- **Coach**: Access only to their own plans and templates
- **Client**: Access only to their assigned plans
- **Public Tokens** (`share_tokens`): Read-only access
- **Audit Trail**: Minimal auditing with `AuditEvent` (optional for future)

## 📝 Development Guidelines

If the agent needs to generate code:

- Ask for missing information before making assumptions
- Follow the established patterns and conventions
- Ensure proper error handling and validation
- Maintain consistency with the existing codebase
- Use the `protectedProcedure` for authenticated endpoints
- Always validate inputs with Zod schemas
- Use Prisma transactions for multi-step database operations

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
