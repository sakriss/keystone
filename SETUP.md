# Keystone — Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon / public key** (long JWT string)

## 2. Set Your Environment Variables

Edit `.env.local` and replace the placeholders:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your_anon_key...
```

## 3. Run the Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Paste the entire file contents and click **Run**

## 4. Create Storage Buckets

In Supabase, go to **Storage** and create 3 buckets:
- `documents` (private)
- `property-photos` (private)
- `room-photos` (private)

Or run this in the SQL Editor:
```sql
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', false);
insert into storage.buckets (id, name, public) values ('room-photos', 'room-photos', false);
```

## 5. Enable Email Auth

In Supabase, go to **Authentication → Providers** and make sure **Email** is enabled.
For local dev, you can disable email confirmation in **Authentication → Settings**.

## 6. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect you to `/login`.
Create an account at `/signup`.

## Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify: [app.netlify.com](https://app.netlify.com)
3. Add the environment variables in Netlify → Site Settings → Environment Variables
4. Build command: `npm run build`
5. Publish directory: `.next`

For Netlify, also install the Netlify Next.js plugin:
```bash
npm install @netlify/plugin-nextjs
```
And add `netlify.toml`:
```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```
