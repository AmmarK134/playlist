# PlaylistHelper

An AI-powered Spotify playlist creator built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🎵 **Spotify Integration** - Connect your Spotify account with OAuth
- 🤖 **AI-Powered** - Chat with AI to create personalized playlists
- 🎨 **Modern UI** - Clean, dark theme with shadcn/ui components
- 🔐 **Secure Authentication** - NextAuth.js with Spotify provider
- 📱 **Responsive Design** - Works on all devices
- ⚡ **Fast Performance** - Built with Next.js 14 and App Router

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: NextAuth.js with JWT sessions
- **State Management**: TanStack Query
- **Icons**: Lucide React
- **Music API**: Spotify Web API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Spotify Developer Account

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd playlist-helper
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your environment variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Spotify OAuth Configuration
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# No database needed - using JWT sessions

# OpenAI (for future AI features)
OPENAI_API_KEY=your-openai-api-key
```

### 4. Set Up Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/api/auth/callback/spotify` to Redirect URIs
4. Copy your Client ID and Client Secret to `.env.local`

### 5. No Database Setup Needed!

Your app uses JWT sessions - no database required!

### 6. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
playlist-helper/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/          # NextAuth configuration
│   ├── dashboard/         # Dashboard page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── Footer.tsx        # Footer component
│   ├── LoginButton.tsx   # Spotify login button
│   └── Navbar.tsx        # Navigation bar
├── lib/                  # Utility libraries
│   ├── providers.tsx     # React Query & NextAuth providers
│   ├── prisma.ts         # Prisma client
│   ├── spotify.ts        # Spotify API client
│   └── utils.ts          # Utility functions
├── prisma/               # Database schema
│   └── schema.prisma     # Prisma schema
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features in Development

- [ ] AI chat interface for playlist creation
- [ ] Playlist management and editing
- [ ] Music discovery recommendations
- [ ] Playlist sharing and collaboration
- [ ] Advanced filtering and search

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, please open an issue on GitHub.
