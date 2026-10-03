# FitLog v1

A trial version of the fitness log web app: sign up / log in, pick a workout template or build
your own, customize a program with an AI assistant, and log workouts to a permanent cloud log.

Built with Next.js, Supabase (database + auth), and the Anthropic API (AI assistant).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account, then a new project.
2. In the project dashboard, go to **Project Settings -> API**. You'll need two values from there:
   - **Project URL**
   - **anon public** key
3. Go to the **SQL Editor** (left sidebar), open a new query, paste in the contents of
   `supabase/schema.sql` from this project, and run it. This creates all the tables.
4. Open a second new query, paste in `supabase/seed_templates.sql`, and run it. This adds one
   placeholder starter template so the app has something to show. Send me your actual programs
   whenever you're ready and I'll turn them into a replacement seed file.

## 2. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account.
2. Go to **API Keys** and create a new key. You'll add a small amount of billing credit there --
   at this app's scale, usage cost is a few cents at most per active user per month.

## 3. Configure the app

1. Copy `.env.local.example` to a new file named `.env.local` in the project root.
2. Fill in the three values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...        (from step 1.2)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   (from step 1.2)
   ANTHROPIC_API_KEY=...               (from step 2.2)
   ```

## 4. Run it locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000, sign up for an account, and try it out.

## 5. Put it online (Vercel)

1. Push this project to a GitHub repo (private is fine).
2. Go to [vercel.com](https://vercel.com), sign up, and "Import Project" from that repo.
3. When it asks for environment variables, add the same three from your `.env.local`.
4. Deploy. Vercel gives you a URL like `fitlog-yourname.vercel.app` that works from any phone or
   computer -- people can "Add to Home Screen" from their browser to get an app-like icon.

## What's in this v1

- Email/password sign-up and login (one account per person).
- Pick a workout template to start, or build your own program from scratch.
- An AI assistant chat that can create or customize a program -- it always proposes changes for
  you to review and explicitly apply, never saves anything silently.
- A workout logger that saves each set to the cloud the moment it's logged, not in a batch at
  the end.
- A history screen pulling straight from that permanent log.

## Forward compatibility

The database schema (`supabase/schema.sql`) uses the same shape -- `exercises`, `workouts`,
`sets` -- that the fuller planned version's dashboard, Records screen, and prescription engine
are designed around. Nothing here needs to be rebuilt to carry this data into that later version;
it only needs new tables added alongside it (RPE/lift-quality distinctions, program calibration
states, the adaptive personalization layer, etc.).

## Known v1 simplifications (by design, not oversights)

- One program at a time per user (the most recently created one). Multi-program switching isn't
  built yet.
- No billing/subscriptions yet -- this is the beta/validation phase, intentionally scoped per
  our plan to skip payment complexity until the core loop is proven.
- No mode-specific progressive overload logic yet (bodybuilding/powerlifting/Olympic/cardio) --
  that's the next major build after this trial version.
- The AI assistant is a single shared model config (Claude Haiku) with no per-user memory beyond
  the chat history shown in the app.
