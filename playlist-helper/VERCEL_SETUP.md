# 🚀 Vercel Deployment Checklist

## ✅ What's Already Fixed:

1. **Prisma Schema** - Updated to PostgreSQL
2. **Package.json Scripts** - Added proper Prisma commands:
   - `"build": "prisma generate && next build"`
   - `"postinstall": "prisma generate"`

## 🔧 What You Need to Do:

### **Step 1: Set up PostgreSQL Database**
Choose one (all have free tiers):
- **Neon** (recommended): https://neon.tech
- **Supabase**: https://supabase.com  
- **PlanetScale**: https://planetscale.com

### **Step 2: Get Database URL**
Your database URL will look like:
```
postgresql://username:password@hostname:port/database?sslmode=require
```

### **Step 3: Set Vercel Environment Variables**
In Vercel Dashboard → Settings → Environment Variables:

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

### **Step 4: Update Spotify App**
1. Go to https://developer.spotify.com/dashboard
2. Edit your app
3. Add redirect URI: `https://your-app.vercel.app/api/auth/callback/spotify`

### **Step 5: Deploy to Vercel**
1. Push code to GitHub
2. Connect repo to Vercel
3. Vercel will automatically run `prisma generate` and build

### **Step 6: Set up Database Schema**
After deployment, run locally once:
```bash
npx prisma db push
```

## 🎯 **That's it!** 

Your app will work on Vercel with:
- ✅ PostgreSQL database
- ✅ Automatic Prisma generation
- ✅ All environment variables
- ✅ Spotify OAuth
- ✅ AI playlist creation

**Total cost: ~$0-5/month for personal use**
