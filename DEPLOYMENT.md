# AI Stock Platform — Production Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                 Vercel (Edge)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Next.js   │  │ Route    │  │ Middleware │ │
│  │ App Router│  │ Handlers │  │ (Auth)    │ │
│  └─────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│        │              │              │       │
└────────┼──────────────┼──────────────┼───────┘
         │              │              │
    ┌────▼────┐   ┌─────▼──────┐  ┌───▼────────┐
    │ Supabase │   │ DeepSeek   │  │ Upstash     │
    │ (DB/Auth)│   │ (AI API)   │  │ (Redis/Cache)│
    └─────────┘   └────────────┘  └─────────────┘
```

| Layer | Service | Purpose |
|-------|---------|---------|
| Hosting | Vercel | Serverless Next.js with Edge middleware |
| Database | Supabase | PostgreSQL + Auth + Realtime |
| AI | DeepSeek | OpenAI-compatible LLM for stock analysis |
| Cache | Upstash Redis | Rate limiting + session cache (future) |
| Stock Data | Finnhub | Real-time market data |

---

## 1. Prerequisites

- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project
- [DeepSeek](https://platform.deepseek.com) API key
- [Finnhub](https://finnhub.io) API key (free tier: 60 calls/min)

---

## 2. Environment Variables

### Supabase Dashboard → Settings → API

```
NEXT_PUBLIC_SUPABASE_URL="https://<project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Supabase Dashboard → Settings → Database → Connection String

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Critical:** Use **Session mode** connection for DATABASE_URL (port 5432 on pooler), and **Transaction mode** for DIRECT_URL (port 6543 on pooler) when using Prisma migrations. For Prisma, both URLs should be session mode (port 5432).

### AI API Keys

```
DEEPSEEK_API_KEY="sk-..."
AI_MODEL="deepseek-chat"
AI_MAX_TOKENS="4096"
AI_TEMPERATURE="0.1"
```

### Stock Data

```
FINNHUB_API_KEY="..."
ALPHA_VANTAGE_API_KEY=""
POLYGON_API_KEY=""
STOCK_PROVIDER="finnhub"
```

### App

```
APP_URL="https://ai-stock-platform.vercel.app"
NODE_ENV="production"
```

---

## 3. Supabase Setup

### 3.1 Enable Extensions

In Supabase SQL Editor:

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fuzzy text search (optional)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 3.2 Run Migrations

```bash
# Local → apply migrations to production Supabase
npx prisma migrate deploy

# Verify
npx prisma studio
```

### 3.3 Row-Level Security (RLS)

Enable RLS on all tables:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read their own analyses
CREATE POLICY "analyses_read_own" ON stock_analysis
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 4. Vercel Deployment

### 4.1 First Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
#   Set up and deploy? → Y
#   Which scope? → your-account
#   Link to existing project? → N
#   Project name? → ai-stock-platform
#   Directory? → ./
#   Override settings? → N
```

### 4.2 Set Environment Variables

```bash
# Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Or via Dashboard: Settings → Environment Variables
# Add ALL variables from .env.example
```

### 4.3 Production Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deploy is set up)
git push origin main
```

### 4.4 Custom Domain (Optional)

```
Vercel Dashboard → Project → Settings → Domains → Add Domain
DNS: Add CNAME record → cname.vercel-dns.com
SSL: Auto-provisioned via Let's Encrypt
```

---

## 5. Prisma Production Workflow

```bash
# 1. Make schema changes locally
#    Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_new_feature

# 3. Commit migration files
git add prisma/migrations/
git commit -m "db: add new_feature migration"

# 4. Deploy migration to production
vercel --prod
#    ↑ This runs `prisma generate && next build`
#    The actual migrate deploy must be run separately:

# 5. Apply migration to production DB
npx prisma migrate deploy
#    ↑ Uses DATABASE_URL from .env or vercel env

# NEVER run `prisma db push` on production.
# NEVER run `prisma migrate dev` against production.
# ALWAYS commit migration files to Git.
```

---

## 6. API Security

### 6.1 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `GET /api/stocks/:ticker` | 30 req | 60 seconds |
| `POST /api/ai/analyze` | 10 req | 120 seconds |
| `GET /api/*` (general) | 60 req | 60 seconds |

### 6.2 API Key Protection

- All AI API keys (DeepSeek, OpenAI) are server-side only — never prefixed with `NEXT_PUBLIC_`
- Supabase `SUPABASE_SERVICE_ROLE_KEY` is server-side only — bypasses RLS
- Client only receives `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS-scoped)

### 6.3 Security Headers

Applied in `vercel.json` and `next.config.ts`:

| Header | Value |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |

### 6.4 CORS

Only the production domain can access API routes.
Configured in `vercel.json` headers for `/api/(.*)`.

---

## 7. Performance Optimization

### 7.1 Build

The `next.config.ts` already optimizes these packages:
```
lucide-react, recharts, date-fns, @radix-ui/react-*
```

### 7.2 Image Optimization

- AVIF & WebP formats enabled
- Remote images from any HTTPS host allowed
- Lazy loading via `loading="lazy"` (default in next/image)

### 7.3 Caching

| Resource | Strategy | Duration |
|----------|----------|----------|
| Static assets | immutable | 1 year |
| API responses | stale-while-revalidate | 60s |
| Stock cache (in-memory) | TTL | 60s |
| AI analysis | DB-persisted | permanent |

### 7.4 Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true npm run build
# Opens visual report of chunk sizes
```

---

## 8. Error Logging

### 8.1 Setup Vercel Logs

```bash
# Real-time logs
vercel logs ai-stock-platform --follow

# Filter by status code
vercel logs ai-stock-platform --status 500

# JSON output for log aggregation tools
vercel logs ai-stock-platform -o json
```

### 8.2 Recommended Observability Stack

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| [Sentry](https://sentry.io) | Error tracking | 5K events/month |
| [Logtail](https://betterstack.com/logtail) | Structured logging | 1 GB/month |
| [Axiom](https://axiom.co) | Log search & dashboards | 500K events |
| [Vercel Analytics](https://vercel.com/analytics) | Web vitals | Free on Pro plan |

### 8.3 Sentry Integration

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# Follow interactive setup
```

---

## 9. Production Checklist

### Pre-Launch

- [ ] All environment variables set in Vercel
- [ ] `prisma migrate deploy` run against production DB
- [ ] RLS policies enabled on all Supabase tables
- [ ] Supabase extensions enabled (pgcrypto, pg_trgm)
- [ ] DeepSeek API key valid
- [ ] Finnhub API key valid
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes without errors
- [ ] `npm run typecheck` passes (tsc --noEmit)
- [ ] `.env.local` NOT committed to Git
- [ ] `prisma/schema.prisma` uses env() for URLs
- [ ] Security headers verified (via browser DevTools)
- [ ] CORS correctly scoped to production domain
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NOT exposed to client

### Post-Launch

- [ ] `vercel logs` shows no startup errors
- [ ] `GET /api/stocks/AAPL` returns 200
- [ ] `POST /api/ai/analyze` returns 200
- [ ] Rate limiting returns 429 when exceeded
- [ ] Invalid ticker returns 404
- [ ] Vercel Analytics showing traffic
- [ ] Supabase Dashboard shows connections
- [ ] SSL certificate valid (automatic with Vercel)

---

## 10. Troubleshooting

### Prisma Client not generated

```bash
# Error: @prisma/client did not initialize yet
npx prisma generate
# If on Vercel: add to buildCommand in vercel.json
```

### Supabase connection fails

```bash
# Check: Supabase project is not paused (free tier pauses after inactivity)
# Go to Supabase Dashboard → Project → Settings → Database → Restore

# Test connection
psql "$DATABASE_URL" -c "SELECT 1"
```

### DeepSeek API errors

```bash
# Verify API key
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY"

# 401 → Invalid key. Regenerate at platform.deepseek.com
# 429 → Rate limited. Check usage dashboard.
# 500 → DeepSeek outage. Retry with backoff (built-in).
```

### Build failures on Vercel

```bash
# Check: Node.js version in Vercel Dashboard → Settings → General → Node.js Version
#   Must be 20.x or later for Next.js 15

# Check: Build logs
vercel logs ai-stock-platform --scope build

# Common fix: Clear build cache
# Vercel Dashboard → Project → Settings → Build & Development → Redeploy
```

### Environment variable not found

```bash
# Verify all env vars are present
vercel env ls

# Pull env vars locally for testing
vercel env pull .env.local

# Remember: NEXT_PUBLIC_ prefixes are inlined at build time.
# Server-side vars must be set in Vercel dashboard, not .env.local.
```

---

## 11. CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 12. Cost Estimate (Free Tier)

| Service | Free Tier | Estimated Usage |
|---------|-----------|-----------------|
| Vercel | 100 GB bandwidth, infinite static | ~5 GB/month |
| Supabase | 500 MB DB, 2 GB bandwidth | ~200 MB DB |
| DeepSeek | Pay-per-token (~$0.15/1M input) | ~$5/month at 100 analyses/day |
| Finnhub | 60 API calls/min | Free tier sufficient |
| **Total** | | **~$5–10/month** |

Scale up as user base grows. DeepSeek costs dominate at scale — add caching aggressively.
