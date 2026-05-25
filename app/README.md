# LaunchPad — The PostgREST-Powered SaaS Boilerplate

> **Your Database IS Your API. Zero Route Code. Ship 10x Faster.**

LaunchPad is the only Next.js SaaS starter kit that uses [PostgREST](https://postgrest.org/) to auto-generate your entire REST API from your PostgreSQL schema. No API routes to write. No controllers to maintain. Add a table, get an endpoint. That's it.

## Why LaunchPad?

Every other SaaS boilerplate makes you write and maintain custom API routes for every database table. LaunchPad eliminates that entirely with PostgREST:

| Feature | Traditional Boilerplate | LaunchPad |
|---------|------------------------|-----------|
| API Layer | Write/maintain custom routes | **Zero API code — auto-generated** |
| Adding a Table | Write route + service + types | **Just create the table → endpoint exists** |
| Security | Manual middleware per route | **PostgreSQL Row Level Security (RLS)** |
| DB Queries | ORM + custom endpoints | **Direct from browser via PostgREST** |
| API Maintenance | Ongoing per-endpoint | **Zero — schema = API** |
| Time to Add Feature | Hours | **Minutes** |

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL (via Prisma for migrations) + PostgREST
- **Authentication**: NextAuth.js v4 (Google, GitHub, Email/Password)
- **Payments**: Stripe (checkout, webhooks, subscriptions)
- **API Layer**: PostgREST (auto-generated from schema)
- **Security**: PostgreSQL Row Level Security (RLS)
- **State**: Zustand + TanStack Query
- **Dark Mode**: next-themes

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-username/launchpad.git
cd launchpad
npm install
```

### 2. Start PostgreSQL + PostgREST

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port `5432` (with auto-initialized schema and RLS policies)
- PostgREST on port `3001` (auto-maps tables to REST endpoints)
- pgAdmin on port `5050` (optional, for database GUI — `docker-compose --profile debug up`)

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your values (see [Environment Variables](#environment-variables) below).

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — your SaaS is running.

## How PostgREST Works

### The Magic: Schema = API

When you create a table in PostgreSQL, PostgREST automatically generates REST endpoints:

```sql
-- 1. Create a table
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Done. You now have these endpoints:
-- GET    /rest/todos          → List todos (RLS filtered)
-- POST   /rest/todos          → Create a todo
-- PATCH  /rest/todos?id=eq.X  → Update a todo
-- DELETE /rest/todos?id=eq.X  → Delete a todo
```

**Zero API code. Zero maintenance. Schema changes = instant API updates.**

### Querying from React

```typescript
import { PostgRESTClient, usePostgRESTQuery } from '@/lib/postgrest';

// Create the client
const client = new PostgRESTClient({
  baseUrl: '/rest',
  getToken: () => getSession().then(s => s?.accessToken),
});

// Use the React hook
function TodoList() {
  const { data, loading } = usePostgRESTQuery(
    client, 'todos', '*',
    { order: 'created_at.desc', limit: 20 }
  );

  return data.map(todo => <TodoItem key={todo.id} {...todo} />);
}

// Or use direct fetch for more control
const res = await fetch('/rest/todos?completed=eq.false&order=created_at.desc', {
  headers: { Authorization: `Bearer ${token}` }
});
const todos = await res.json();
```

### Advanced Queries via URL Parameters

| PostgREST Query | Equivalent SQL |
|----------------|----------------|
| `GET /rest/todos?completed=eq.false` | `SELECT * FROM todos WHERE completed = false;` |
| `GET /rest/todos?order=created_at.desc&limit=5` | `SELECT * FROM todos ORDER BY created_at DESC LIMIT 5;` |
| `GET /rest/todos?select=id,title,completed` | `SELECT id, title, completed FROM todos;` |
| `GET /rest/todos?select=*,users(name,email)` | `SELECT t.*, u.name, u.email FROM todos t JOIN users u ON t.user_id = u.id;` |
| `POST /rest/rpc/get_user_stats {"p_user_id":"abc"}` | `SELECT * FROM get_user_stats('abc');` |

### Row Level Security

RLS policies enforce data access at the database level. When a user makes a request, their JWT token is passed to PostgREST, which sets the database session identity. RLS policies then automatically filter queries to only return data belonging to that user.

```sql
-- Users can only see their own todos
CREATE POLICY "Users see own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create todos with their own user_id
CREATE POLICY "Users create own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Security guaranteed by PostgreSQL, not by your application code.**

## Project Structure

```
launchpad/
├── docker-compose.yml          # PostgreSQL + PostgREST + pgAdmin
├── postgrest/
│   ├── schema.sql              # Database schema with RLS policies
│   ├── auth.sql                # Auth roles and JWT helpers
│   └── postgrest.conf          # PostgREST server configuration
├── prisma/
│   └── schema.prisma           # Prisma schema (for migrations)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Auth pages (login, signup)
│   │   ├── (dashboard)/        # Dashboard pages (protected)
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── explorer/       # PostgREST API Explorer ★
│   │   │   ├── api-keys/       # API key management
│   │   │   ├── billing/        # Subscription management
│   │   │   └── settings/       # User settings
│   │   ├── api/                # Next.js API routes (for webhooks, etc.)
│   │   ├── layout.tsx          # Root layout with theme provider
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── landing/            # Landing page sections
│   │   ├── dashboard/          # Dashboard components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── theme-provider.tsx  # Dark mode theme provider
│   └── lib/
│       ├── auth.ts             # NextAuth configuration
│       ├── db.ts               # Prisma client
│       ├── postgrest/
│       │   ├── client.ts       # PostgREST client class ★
│       │   └── hooks.ts        # React hooks for PostgREST ★
│       ├── stripe.ts           # Stripe configuration
│       └── session.ts          # Auth helpers
└── .env.example                # Environment variable template
```

## Features

### Core (PostgREST-Powered)
- ✅ Auto-generated REST API from PostgreSQL schema
- ✅ PostgREST client library with TypeScript types
- ✅ React hooks (`usePostgRESTQuery`, `usePostgRESTMutation`)
- ✅ Row Level Security (RLS) on all tables
- ✅ JWT authentication integrated with PostgREST
- ✅ API Explorer dashboard (visualize tables → endpoints)
- ✅ Stored procedure support via RPC

### Authentication
- ✅ NextAuth.js v4 with JWT strategy
- ✅ Google OAuth
- ✅ GitHub OAuth
- ✅ Email/Password with bcrypt
- ✅ Protected routes middleware
- ✅ Auth pages (login, signup)

### Payments
- ✅ Stripe checkout sessions
- ✅ Subscription management (Free, Pro, Enterprise)
- ✅ Webhook handler for Stripe events
- ✅ Billing page with plan comparison

### Dashboard
- ✅ Responsive sidebar navigation
- ✅ Stats overview with revenue, users, requests
- ✅ API usage charts
- ✅ API key management (create, copy, delete)
- ✅ Billing and subscription management
- ✅ Settings (profile, account, notifications)
- ✅ Dark mode toggle

### UI/UX
- ✅ Tailwind CSS 4 styling
- ✅ shadcn/ui component library
- ✅ Framer Motion animations
- ✅ Responsive design (mobile-first)
- ✅ Dark mode with next-themes
- ✅ Professional landing page

### Developer Experience
- ✅ Docker Compose for one-command setup
- ✅ PostgreSQL auto-initialized with schema + RLS
- ✅ Comprehensive TypeScript types
- ✅ ESLint configuration
- ✅ Environment variable validation

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_SECRET` | Secret for JWT signing | ✅ |
| `NEXTAUTH_URL` | Your app URL | ✅ |
| `GITHUB_ID` | GitHub OAuth App ID | ✅ |
| `GITHUB_SECRET` | GitHub OAuth App Secret | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ |
| `NEXT_PUBLIC_POSTGREST_URL` | PostgREST server URL | ✅ |
| `PGRST_JWT_SECRET` | Must match NEXTAUTH_SECRET | ✅ |

## Deployment

### Frontend (Vercel)

Deploy your Next.js app to Vercel as normal:

```bash
vercel deploy
```

### Database + PostgREST (Railway / Fly.io / Any Docker host)

Your PostgREST and PostgreSQL services run separately from the frontend. This is an advantage — your database tier scales independently.

**Railway** (recommended):
1. Create a new PostgreSQL service
2. Add a Docker service using the PostgREST image
3. Set the environment variables to connect them

**Fly.io**:
```bash
fly launch --image postgrest/postgrest:v12.2.0
```

**Any VPS with Docker**:
```bash
docker-compose up -d
```

## Adding a New Feature

The whole point of LaunchPad is how easy it is to add features. Here's the workflow:

### 1. Create the table

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Add Row Level Security

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own comments"
  ON comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 3. Use it in React

```typescript
// That's it! Your API already exists:
// GET    /rest/comments
// POST   /rest/comments
// PATCH  /rest/comments?id=eq.X
// DELETE /rest/comments?id=eq.X

const { data } = usePostgRESTQuery(client, 'comments', '*');
```

**No API route to write. No controller to maintain. No types to update.**

## License

MIT — Use it for as many projects as you want.

---

Built with ❤️ using Next.js, PostgREST, and PostgreSQL.
