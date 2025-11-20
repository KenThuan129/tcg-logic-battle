# IT Colloseum

IT Colloseum is a tactical card battle game where players command their headquarters (HQ) in strategic combat against AI opponents or other players. Build custom decks, manage resources, and outmaneuver your enemies in this turn-based strategy game.

## Game Overview

### Core Gameplay

Players engage in tactical card battles where the goal is to reduce the enemy HQ's health to zero while protecting your own. Each player starts with:
- **HQ Health Points (HP)**: Your headquarters' life total
- **Mana System**: A resource that regenerates each turn, used to play cards
- **Deck & Hand**: A collection of cards drawn each turn (max 7 in hand)
- **Roles**: Players can be either an **Attacker** (offensive focus) or **Defender** (defensive focus)

### Card System

The game features three card types with distinct roles:

- **🔴 Red Cards (Attack)**: Deal damage to enemy HQ with various flavors like burst, lifesteal, damage-over-time (DoT), and shield-bypass attacks
- **🟡 Yellow Cards (Defense)**: Protect your HQ with blocking, deflection, healing, cleanse effects, and debuff immunity
- **🟢 Green Cards (Utility)**: Support your strategy with buffs, debuffs, card draw, and healing

Cards have mana costs, value ratings, and special effects. The game includes multiple deck archetypes like:
- Firewall Guardian
- Quantum Burst
- Pulse Vanguard
- Shadow Infiltrator

### Special Mechanics

- **Sigils**: Build up Overload or Override sigils by meeting specific conditions to unlock powerful effects
- **Turn-Based Combat**: Strategic resource management and timing are crucial for victory
- **Adaptive AI**: PvE opponents scale in difficulty and adapt to your playstyle

### Game Modes

1. **PvE Skirmish**: Battle against adaptive AI commanders at various difficulty levels. Perfect for testing decks, practicing combos, and honing your strategy.

2. (Future Development) **PvP Colosseum**: Enter online multiplayer matches through Supabase-powered lobbies. Host public or private rooms, invite friends, and compete in real-time synchronized battles.

## Features

- 🎮 **Rich Card Battle System**: Tactical gameplay with attack, defense, and utility cards
- 👤 **User Authentication**: Supabase-powered profiles with persistent user data
- 🤖 **AI Opponents**: Adaptive AI with multiple difficulty settings
- 🌐 **Online Multiplayer**: Real-time PvP matches via Supabase Realtime
- 🎴 **Deck Management**: Build and customize your card collection
- 📊 **Game State Tracking**: Persistent match history and player statistics
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and shadcn/ui

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Game Engine**: Custom TypeScript game logic

## Getting Started

Visit `http://localhost:3000` and sign in to start playing!

## Project Structure

- `/app` - Next.js app directory with pages and components
  - `/components` - React components (GameBoard, Card, Hand, HQPanel, etc.)
  - `/lib` - Game engine logic and utilities
  - `/store` - Zustand state management
- `/supabase` - Database schema and migrations
- `/components/ui` - Reusable UI components (shadcn/ui)

## Development

The game engine handles turn logic, card effects, mana systems, and game state synchronization. State is managed centrally with Zustand, making it easy to support both local PvE and synchronized PvP matches.

### Key Systems

- **Game Engine** (`lib/gameEngine.ts`): Core game logic for card actions and turn processing
- **Game Store** (`store/gameStore.ts`): Centralized state management for game sessions
- **Card System** (`lib/cards/pool.ts`): Card definitions and archetypes
- **PvP Sync** (`app/components/OfflineShell.tsx`): Real-time match synchronization via Supabase

## Deployment

### GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

#### Automated Deployment

1. **Enable GitHub Pages in your repository**:
   - Go to your repository Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Push to the main branch**:
   - The workflow will automatically build and deploy your site
   - The site will be available at `https://[your-username].github.io/[repository-name]/`

#### Manual Deployment (Optional)

If you want to build and deploy manually:

```bash
# Set the base path (replace with your repository name)
export NEXT_PUBLIC_BASE_PATH="/[repository-name]"

# Build the static site
npm run export

# The static files will be in the 'out' directory
# You can push the 'out' directory contents to the gh-pages branch
```

**Note**: When deploying to GitHub Pages, only the offline mode (PvE) will be available since API routes require a server. The app will work in offline mode using local storage for decks.

### Other Platforms (Vercel, Netlify, etc.)

When deploying to platforms that support Next.js API routes:

1. Set the Supabase environment variables in your deployment platform
2. Ensure Realtime is enabled for the `matches` table in Supabase
3. Keep `SUPABASE_SERVICE_ROLE_KEY` as an encrypted server-side secret (never expose to client)

## License

[Add your license information here]
