# Engineering Guidelines

## Naming Conventions

- Files: kebab-case (`rate-plan-resolver.ts`)
- Classes: PascalCase
- Variables/functions: camelCase
- DB tables: snake_case with module prefix (`lims_accessions`, `billing_bills`)
- API routes: kebab-case (`/api/v1/billing/bills`)
- Enums: PascalCase type, UPPER_SNAKE values

## Module Boundaries

- Each module owns its entities, services, repositories, and REST controllers
- No cross-module repository access
- Cross-module interactions via service interfaces (imported function calls)
- DTOs for API contracts; internal entities not leaked across modules

## Database Rules

- All tables: `id` (UUID), `tenant_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `version`
- Transactional tables: add `branch_id`
- Status columns: CHECK constraints for valid values
- Foreign keys: ON DELETE RESTRICT
- Optimistic locking via `version` column on all updates
- All queries include `tenant_id` first

## API Conventions

- All endpoints under `/api/v1/{module}/`
- Standard response: `{ data: T }` or `{ data: T[], meta: { page, limit, total } }`
- Error response: `{ error_code, message, details?, correlation_id }`
- Validation via Zod schemas
- Auth via Bearer JWT token

## Testing

- Backend: Vitest (`npm test` in packages/backend)
- Frontend: Manual testing (unit tests deferred)

## Commands

```bash
# Backend
cd packages/backend
npm run dev          # Start dev server (tsx watch)
npm test             # Run tests
npx prisma migrate dev   # Run migrations
npx tsx prisma/seed.ts   # Seed data

# Frontend
cd packages/frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
```
