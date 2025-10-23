# 🚀 Vercel Deployment Guide

## Prerequisites

1. **PostgreSQL Database** - Choose one:
   - [Neon](https://neon.tech) (Free tier: 0.5GB)
   - [Supabase](https://supabase.com) (Free tier: 500MB)
   - [PlanetScale](https://planetscale.com) (Free tier: 1GB)

## Step 1: Set up PostgreSQL Database

1. Create a new database on your chosen provider
2. Copy the connection string (it should look like):
   ```
   postgresql://username:password@hostname:port/database?sslmode=require
   ```

## Step 2: Configure Vercel Environment Variables

In your Vercel dashboard, go to Settings > Environment Variables and add:

```bash
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# NextAuth
NEXTAUTH_SECRET=your_strong_secret_here
NEXTAUTH_URL=https://your-app.vercel.app

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## Step 3: Update Spotify App Settings

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Edit your app
3. Add redirect URI: `https://your-app.vercel.app/api/auth/callback/spotify`
4. Save changes

## Step 4: Deploy to Vercel

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Vercel will automatically:
   - Run `prisma generate` (from postinstall script)
   - Build your app with `prisma generate && next build`
   - Deploy to production

## Step 5: Set up Database Schema

After deployment, run locally once:

```bash
npx prisma db push
```

This creates the tables in your PostgreSQL database.

## Step 6: Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Use this as your `NEXTAUTH_SECRET` in Vercel.

## Security Notes

✅ **What's secure:**
- Environment variables are encrypted in Vercel
- HTTPS is automatic
- No sensitive data stored in code
- Spotify OAuth is industry standard

⚠️ **Keep secret:**
- Never commit `.env.local` to git
- Use strong `NEXTAUTH_SECRET`
- Don't share your database URL

## Troubleshooting

**If you get Prisma errors:**
1. Make sure `DATABASE_URL` is set in Vercel
2. Run `npx prisma db push` locally
3. Redeploy

**If Spotify auth fails:**
1. Check redirect URI matches exactly
2. Verify environment variables are set
3. Check Spotify app is not in development mode

## Cost Estimate

- **Vercel**: Free (hobby plan)
- **PostgreSQL**: Free (Neon/Supabase free tier)
- **Spotify API**: Free
- **OpenAI API**: Pay per use (~$0.01-0.10 per playlist)

**Total: ~$0-5/month for personal use**
