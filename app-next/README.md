## inro (Next.js product scaffold)

This is the production scaffold for your end-to-end AI interview prep app:

- **Real accounts** (email/password)
- **Onboarding profile**
- **Session creation** (JD + resume)
- **Server-side Gemini analysis** (API key hidden)
- **Dashboard + saved cycles**

## Tech stack

- Next.js (App Router, TypeScript)
- NextAuth (credentials auth)
- Prisma + Postgres
- Gemini API (`gemini-2.5-flash-lite`)

## 1) Environment variables

Create `.env.local` with:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
AUTH_SECRET="replace-with-a-long-random-secret"
GEMINI_API_KEY="AIza..."
```

## 2) Install and generate Prisma client

```bash
npm install
npx prisma generate
```

## 3) Apply DB schema

```bash
npx prisma migrate dev --name init
```

For Vercel production, run:

```bash
npx prisma migrate deploy
```

## 4) Run local

```bash
npm run dev
```

Open `http://localhost:3000`.

## 5) Vercel deploy (recommended)

Set these project env vars in Vercel:

- `DATABASE_URL`
- `AUTH_SECRET`
- `GEMINI_API_KEY`

Then deploy `app-next` as your root directory in Vercel project settings.

## Current routes

- `/login`
- `/signup`
- `/onboarding`
- `/dashboard`
- `/sessions/new`
- `/sessions/[id]`
- API:
  - `/api/register`
  - `/api/profile`
  - `/api/analyze` (Gemini, server-side)
  - `/api/auth/[...nextauth]`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
