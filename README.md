# CRM & Marketing Automation Platform - Frontend

A modern, comprehensive CRM and Marketing Automation Platform built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Modules (87+ Pages)
- **Dashboard** - Analytics, KPIs, recent activity
- **Leads Management** (8 pages) - List, detail, pipeline, import, follow-ups
- **Campaigns** (12 pages) - Email, SMS, phone campaigns with analytics
- **AI Intelligence Hub** (6 pages) - Lead scoring, segmentation, predictions
- **Analytics & Reporting** (7 pages) - Custom reports, visualizations
- **Communications** (6 pages) - SMS, calls, social media, newsletter
- **Automation & Workflows** (3 pages) - Visual workflow builder
- **Integrations** (5 pages) - CRM sync, API keys, webhooks
- **Settings** (12 pages) - Profile, team, security, business settings
- **Admin Tools** (10 pages) - User management, flags, backups
- **Billing** (5 pages) - Subscriptions, invoices, usage
- **Authentication** (5 pages) - Login, register, password reset
- **Help & Support** (4 pages) - Documentation, tutorials

### Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite (lightning-fast HMR)
- **Styling:** Tailwind CSS v3
- **Routing:** React Router v6
- **State Management:** Zustand (lightweight & powerful)
- **Server State:** TanStack Query v5 (React Query)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Your Flask backend running on `http://localhost:5000`

### Setup Steps

1. **Install dependencies:**
```powershell
npm install
```

Or with yarn:
```powershell
yarn install
```

Or with pnpm:
```powershell
pnpm install
```

2. **Start the development server:**
```powershell
npm run dev
```

The app will be available at `http://localhost:3000`

3. **Build for production:**
```powershell
npm run build
```

4. **Preview production build:**
```powershell
npm run preview
```

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Card, Input, etc.)
│   └── layout/          # Layout components (Sidebar, Header, etc.)
├── pages/               # Page components (87+ pages)
│   ├── dashboard/       # Dashboard pages
│   ├── leads/           # Leads management (8 pages)
│   ├── campaigns/       # Campaign management (12 pages)
│   ├── ai/              # AI & Intelligence Hub
│   ├── analytics/       # Analytics & reporting
│   ├── communications/  # Communication center
│   ├── automation/      # Workflow automation
│   ├── integrations/    # Integration management
│   ├── settings/        # Settings pages (12 pages)
│   ├── admin/           # Admin tools (10 pages)
│   ├── billing/         # Billing & subscriptions
│   └── auth/            # Authentication pages
├── lib/                 # Utilities and API client
│   ├── api.ts          # Axios instance with interceptors
│   └── utils.ts        # Helper functions
├── store/               # Zustand stores
│   ├── authStore.ts    # Authentication state
│   └── uiStore.ts      # UI state (theme, sidebar)
├── types/               # TypeScript type definitions
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
└── index.css            # Global styles & Tailwind

```

## 🎨 Design System

### Color Palette
- **Primary:** Blue (#3B82F6) - Primary actions, links
- **Success:** Green (#10B981) - Success states, positive metrics
- **Warning:** Amber (#F59E0B) - Warnings, pending states
- **Destructive:** Red (#EF4444) - Errors, destructive actions
- **Muted:** Slate - Secondary text, borders

### Components
- **Buttons:** 6 variants (default, destructive, outline, secondary, ghost, link)
- **Cards:** Clean, elevated containers with headers/footers
- **Tables:** Sortable, filterable with pagination
- **Forms:** Validated inputs with React Hook Form + Zod
- **Badges:** Status indicators with color variants
- **Modals:** 50+ unique modal dialogs
- **Charts:** Beautiful data visualizations with Recharts

### Dark Mode
- Full dark mode support
- Automatic theme switching
- Persisted user preference

## 🔌 API Integration

The frontend is configured to proxy API requests to your Flask backend:

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

### Making API Calls

```typescript
import api from '@/lib/api'

// GET request
const leads = await api.get('/leads')

// POST request
const newLead = await api.post('/leads', data)

// PUT request
const updated = await api.put(`/leads/${id}`, data)

// DELETE request
await api.delete(`/leads/${id}`)
```

### Using React Query

```typescript
import { useQuery } from '@tanstack/react-query'

function LeadsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(res => res.data)
  })
}
```

## 📝 Environment Variables

Create a `.env` file in the root:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🚢 Deployment

### Build
```powershell
npm run build
```

### Output
The `dist` folder contains the production build ready to deploy.

### Deployment Options
- **Vercel:** `vercel deploy`
- **Netlify:** Drag & drop `dist` folder
- **AWS S3 + CloudFront**
- **Docker:** Include Dockerfile if needed

## 🧪 Development

### Linting
```powershell
npm run lint
```

### Type Checking
```powershell
npx tsc --noEmit
```

## 🗺️ Current Status

### ✅ Completed (Initial Setup)
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Tailwind CSS configuration
- [x] Base component library (Button, Card, Input, Badge, Table)
- [x] Layout components (Sidebar, Header, Auth Layout)
- [x] Routing setup (React Router)
- [x] State management (Zustand stores)
- [x] API client with interceptors
- [x] Type definitions
- [x] Dashboard page
- [x] Authentication pages (Login, Register)
- [x] Leads pages (5 pages: List, Detail, Pipeline, Import, Follow-ups)
- [x] Campaign pages (4 pages: List, Create, Detail, Edit)
- [x] 404 page

### 📋 Next Steps (To Complete All 87+ Pages)

1. **Create remaining pages:**
   - AI Hub (6 pages)
   - Analytics (7 pages)
   - Communications (6 pages)
   - Automation (3 pages)
   - Integrations (5 pages)
   - Settings (12 pages)
   - Admin (10 pages)
   - Billing (5 pages)
   - Help (4 pages)

2. **Add all 50+ modals:**
   - Lead modals (Add, Edit, Bulk Edit, Import, Tags, Notes)
   - Campaign modals (Create, Edit, Templates, Preview, Test)
   - Settings modals (Profile, 2FA, Invite User, API Keys)
   - Admin modals (Flags, Backup, Export)

3. **Implement advanced features:**
   - Real-time updates (WebSockets)
   - Advanced filtering & search
   - Drag & drop (pipeline, file upload)
   - Command palette (Cmd+K)
   - Keyboard shortcuts
   - Export to PDF/Excel
   - PWA capabilities

4. **Polish & optimization:**
   - Loading states & skeletons
   - Error boundaries
   - Optimistic updates
   - Code splitting & lazy loading
   - Image optimization
   - Accessibility improvements

## 🎯 Quick Start Guide

1. **Install Node.js dependencies:**
   ```powershell
   npm install
   ```

2. **Start your Flask backend** (if not already running):
   ```powershell
   # In your Flask project directory
   python app.py
   ```

3. **Start the frontend:**
   ```powershell
   npm run dev
   ```

4. **Open browser:**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

5. **Login** (if auth is required):
   - The frontend will handle authentication
   - Tokens are stored in localStorage
   - Auto-redirect to `/auth/login` on 401

## 📚 Key Files to Customize

- `src/lib/api.ts` - API base URL and interceptors
- `tailwind.config.js` - Theme colors, fonts, spacing
- `src/index.css` - Global styles, CSS variables
- `vite.config.ts` - Build configuration, proxy settings
- `src/App.tsx` - Add new routes here
- `src/components/layout/Sidebar.tsx` - Modify navigation items

## 🤝 Contributing

This is a generated frontend codebase. To extend:

1. Add new pages in `src/pages/`
2. Create reusable components in `src/components/`
3. Define types in `src/types/`
4. Add routes in `src/App.tsx`
5. Update navigation in `Sidebar.tsx`

## 📖 Documentation

### Component Library
All UI components are based on shadcn/ui patterns:
- `Button` - Primary, secondary, outline, destructive variants
- `Card` - With header, content, footer sections
- `Input` - Text, email, password, number inputs
- `Badge` - Status indicators
- `Table` - Data tables with sorting
- `Modal` - Dialog components

### Routing
```typescript
// Public routes
/auth/login
/auth/register

// Protected routes
/                    -> Dashboard
/leads               -> Leads list
/leads/:id           -> Lead detail
/leads/pipeline      -> Pipeline view
/campaigns           -> Campaigns list
/campaigns/:id       -> Campaign detail
// ... and 80+ more routes
```

### State Management
```typescript
// UI State
const { sidebarOpen, theme, toggleSidebar, toggleTheme } = useUIStore()

// Auth State
const { user, token, setAuth, logout } = useAuthStore()
```

## 🐛 Troubleshooting

### Dependencies not installing
```powershell
# Clear npm cache
npm cache clean --force
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```powershell
# Change port in vite.config.ts
server: {
  port: 3001, // or any available port
}
```

### API requests failing
- Ensure Flask backend is running on port 5000
- Check CORS configuration in Flask
- Verify proxy configuration in `vite.config.ts`

## 📞 Support

For issues or questions:
1. Check existing documentation
2. Review error messages in browser console
3. Verify Flask backend is running correctly
4. Check network tab for API call failures

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**

**Status:** Initial structure complete - Ready for expansion to all 87+ pages
