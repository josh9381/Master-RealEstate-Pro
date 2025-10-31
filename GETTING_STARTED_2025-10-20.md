# CRM Frontend - Quick Start Guide

## 🚀 **Get Started in 3 Steps**

### 1️⃣ Install Dependencies
```powershell
npm install
```

### 2️⃣ Start Development Server
```powershell
npm run dev
```

### 3️⃣ Open Browser
Navigate to: **http://localhost:3000**

---

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🗺️ Current Pages (Ready to Use)

✅ **Dashboard** (`/`)
- Analytics overview with charts
- KPI cards (Revenue, Leads, Conversion, Campaigns)
- Recent leads table

✅ **Authentication** (`/auth/*`)
- Login page (`/auth/login`)
- Register page (`/auth/register`)
- Responsive auth layout

✅ **Leads Management** (`/leads/*`)
- Leads list with filters (`/leads`)
- Lead detail view (`/leads/:id`)
- Pipeline board (`/leads/pipeline`)
- CSV import (`/leads/import`)
- Follow-ups tracker (`/leads/followups`)

✅ **Campaigns** (`/campaigns/*`)
- Campaign list (`/campaigns`)
- Create campaign wizard (`/campaigns/create`)
- Campaign analytics (`/campaigns/:id`)
- Campaign editor (`/campaigns/:id/edit`)

✅ **404 Page** (`/404`)
- Custom not found page

---

## 🎯 What's Next?

The initial structure is complete with **20+ pages**. To reach the full 87+ pages:

### Phase 1: Core Pages (Week 1)
- [ ] AI Hub pages (6 pages)
- [ ] Analytics pages (7 pages)
- [ ] Communications pages (6 pages)

### Phase 2: Advanced Features (Week 2)
- [ ] Automation & Workflows (3 pages)
- [ ] Integrations (5 pages)
- [ ] Settings (12 pages)

### Phase 3: Admin & Support (Week 3)
- [ ] Admin tools (10 pages)
- [ ] Billing (5 pages)
- [ ] Help & Support (4 pages)

### Phase 4: Polish (Week 4)
- [ ] All 50+ modals
- [ ] Loading states
- [ ] Error handling
- [ ] Animations
- [ ] Accessibility

---

## 🛠️ Tech Stack Summary

- ⚛️ **React 18** + TypeScript
- ⚡ **Vite** - Fast builds
- 🎨 **Tailwind CSS** - Utility-first styling
- 🧭 **React Router** - Client-side routing
- 🐻 **Zustand** - State management
- 🔄 **TanStack Query** - Server state
- 📊 **Recharts** - Data visualization
- 🎭 **Lucide** - Icon library

---

## 🔗 Connect to Your Backend

The frontend is configured to proxy API requests to your Flask backend:

**Backend URL:** `http://localhost:5000`  
**Frontend URL:** `http://localhost:3000`

All requests to `/api/*` are automatically proxied to your Flask server.

---

## 📞 Need Help?

1. Check `README.md` for detailed documentation
2. Review error messages in browser console
3. Ensure Flask backend is running on port 5000
4. Verify all dependencies are installed

---

**Happy Coding! 🎉**
