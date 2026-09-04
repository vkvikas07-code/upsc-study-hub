# UPSC Study Hub

A web-first UPSC preparation platform designed for accessibility, low maintenance and one-codebase deployment to the web and Android.

## Stack
- Ionic + React + TypeScript
- Vite
- Capacitor 8 for Android
- Supabase for database/auth/storage
- GitHub Actions for website + APK builds

## What already works in this starter
- Responsive mobile + desktop UI
- Home dashboard
- Daily task tracker persisted in localStorage
- Syllabus tracker UI
- Functional MCQ practice with explanations
- Current-affairs feed
- Admin Studio prototype that publishes locally without code changes
- PWA manifest + service worker starter
- Supabase schema and RLS starter policies
- GitHub Pages deployment workflow
- GitHub Actions Android debug APK workflow

## Local setup
1. Install Node.js 22+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local URL shown by Vite.

## Supabase setup
1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env` and add your project URL and publishable key.
4. Never put a service-role key in the browser app.

## Android
After installing dependencies:

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

For a free cloud debug APK, push this repo to GitHub and run **Actions → Build Android APK → Run workflow**. Download the generated artifact from the workflow run.

## Website
Enable GitHub Pages with **Source: GitHub Actions**. Every push to `main` builds and deploys `dist/` automatically.

## Production roadmap
1. Wire Admin Studio CRUD to Supabase.
2. Add authentication and editor/admin roles.
3. Add current-affairs authoring fields: why in news, background, prelims facts, mains analysis, PYQ link.
4. Add full question bank, timed tests and result analytics.
5. Add notes, bookmarks, offline packs and low-data mode.
6. Add push notifications only for genuinely useful updates.
7. Add AAB release signing for Play Store.
8. Add accessibility checks, bilingual content and performance optimization for low-cost Android phones.

## Mission rule
The platform should reduce friction for aspirants, not create more content overload. Prefer short, syllabus-linked, source-aware material over volume.
