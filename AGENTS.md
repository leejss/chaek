# AGENTS.md

## Commands

### Development
- `bun --bun next dev` - Start development server
- `bun --bun next build` - Build for production
- `bun --bun next start` - Start production server

### Code Quality
- `eslint` - Run ESLint (fixes automatically)
- **Note**: Type checking happens during `bun --bun next build`. No separate typecheck command exists.

### Database
- `bun run db:push` - Push schema changes to database
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Run migrations

### Testing
- **No test framework configured** - Tests are not currently set up in this project.

---

## Code Style Guidelines

### Imports
- External imports first, then internal `@/*` imports
- Use `@/*` path alias for all internal imports (mapped to project root)
- Group imports by type: external → internal → type-only imports
- Remove unused imports

```typescript
import { z } from "zod";
import { streamText } from "ai";
import { HttpError } from "@/lib/errors";
import { BookContextState } from "@/lib/book/types";
```

### Formatting
- 2 spaces indentation
- No trailing commas in object/array definitions
- Single quotes for strings unless escaping needed
- Max line length: typically 80-100 chars

### Type Safety
- Strict TypeScript enabled (`strict: true`)
- Use Zod for runtime validation and schema definition
- Type inference over explicit types when obvious
- Define types in `types.ts` files within respective domains
- Use discriminated unions for complex state

```typescript
const UserSchema = z.object({ name: z.string() });
type User = z.infer<typeof UserSchema>;
type Result = { ok: true; data: T } | { ok: false; error: Error };
```

### Naming Conventions
- Variables/Functions: camelCase
- Types/Interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE or PascalCase for config objects
- Enums: PascalCase with UPPER_SNAKE_CASE values
- Files: camelCase for utilities, PascalCase for components
- Components: PascalCase, export default

```typescript
const DEFAULT_MODEL = "gemini-3-flash-preview";
enum AIProvider { GOOGLE = "google", ANTHROPIC = "anthropic" }
interface BookContextState { ... }
function generateTOC() { ... }
```

### Error Handling
- Use custom `HttpError` class for API errors (status + public message)
- Use `InvalidJsonError` for JSON parsing failures
- API routes: wrap try-catch, normalize errors with `normalizeToHttpError()`
- Return consistent error response: `{ error: string, ok: false }`
- Log errors with `console.error()` before throwing

```typescript
try {
  const jsonResult = await readJson(req);
  if (!jsonResult.ok) throw jsonResult.error;
} catch (error) {
  console.error("Operation error:", error);
  const httpError = normalizeToHttpError(error);
  if (httpError) return httpErrorToResponse(httpError);
  return NextResponse.json({ error: "Internal server error", ok: false }, { status: 500 });
}
```

### React Components
- Client components: `"use client"` directive at top of file
- Functional components with `React.FC` or direct function syntax
- Extract subcomponents to `_components/` directory
- Use Tailwind CSS for styling, className concatenation with template literals
- Props interface defined before component, extends HTML attributes when needed

```typescript
"use client";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}
const Button: React.FC<ButtonProps> = ({ children, variant = "primary", ...props }) => {
  return <button className={`${baseStyles} ${variants[variant]}`} {...props}>{children}</button>;
};
```

### State Management
- Zustand for global state with `devtools` middleware
- Combine initial state with actions using `combine()`
- Store files named with "Store" suffix (e.g., `bookContext.tsx`, `settingsStore.ts`)
- Type state and actions separately

### API Routes
- Validate request body with Zod schemas
- Use `readJson()` utility from `@/utils` for JSON parsing
- Return `NextResponse.json()` with consistent shape
- Separate validation logic into named functions

### Database
- Drizzle ORM with PostgreSQL
- Schema definitions in `db/schema.ts`
- Use `uuid` for primary keys, `text` for strings, `timestamp` for dates
- Foreign keys with cascade deletes where appropriate

### AI/Prompt Engineering
- Prompts organized in `lib/ai/specs/` directory
- Use registry pattern: define spec, register in module-level code
- Three kinds: "object" (structured output), "text", "stream"
- System messages in `<role>` and `<instructions>` tags
- Use Zod schemas for output structure

### File Organization
- `app/` - Next.js app directory (routes)
- `lib/` - Shared business logic, utilities
- `db/` - Database schema and connection
- `utils/` - Pure utility functions
- `_components/` - Private component directories
- `api/` - API routes under `app/api/`

### Comments
- NO comments unless explicitly requested
- Code should be self-documenting
- Exception: complex AI prompts may need documentation

### Database Operations
- Use Drizzle ORM queries
- Prefer `insert().values().returning()` for inserts with return data
- Use `.onConflictDoUpdate()` for upserts
- Define indexes for query optimization

### Environment Variables
- Server-only: use `serverEnv` from `@/lib/env`
- Client-safe: use `clientEnv` from `@/lib/env`
- Zod schemas for validation
- `NODE_ENV` enum: "development" | "production" | "test"
