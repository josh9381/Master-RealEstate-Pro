# 🚀 Week 3: Frontend Integration Plan

**Date:** October 26, 2025  
**Status:** 🟢 **READY TO START**  
**Prerequisites:** ✅ Backend Complete (54 endpoints, 158 tests)

---

## 📋 **Week 3 Overview**

**Goal:** Connect the existing React frontend to the backend API and create a fully functional full-stack application.

**Timeline:** 5-7 days  
**Difficulty:** Medium (integration work, error handling, state management)

---

## 🎯 **Week 3 Objectives**

### **Primary Goals:**
1. ✅ Backend API fully functional (DONE)
2. ⏳ Frontend connects to backend
3. ⏳ User authentication flow works end-to-end
4. ⏳ All major features use real data
5. ⏳ Error handling and loading states
6. ⏳ Production-ready full-stack app

### **Success Criteria:**
- [ ] User can register and login
- [ ] Dashboard shows real analytics data
- [ ] Can create, read, update, delete leads
- [ ] Can create and manage campaigns
- [ ] Can add notes and tasks
- [ ] All API calls have loading states
- [ ] All errors are handled gracefully
- [ ] Token refresh works automatically

---

## 🏗️ **Week 3 Implementation Plan**

### **Day 1-2: Core Infrastructure** ⏳

#### **1. API Client Setup**
**Location:** `frontend/src/lib/api-client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class APIClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Request interceptor - add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const { data } = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken }
            );
            
            localStorage.setItem('accessToken', data.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Auth
  async register(data: RegisterData) {
    return this.client.post('/auth/register', data);
  }
  
  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }
  
  async getCurrentUser() {
    return this.client.get('/auth/me');
  }
  
  // Leads
  async getLeads(params?: LeadQueryParams) {
    return this.client.get('/leads', { params });
  }
  
  async getLead(id: string) {
    return this.client.get(`/leads/${id}`);
  }
  
  async createLead(data: CreateLeadData) {
    return this.client.post('/leads', data);
  }
  
  async updateLead(id: string, data: UpdateLeadData) {
    return this.client.put(`/leads/${id}`, data);
  }
  
  async deleteLead(id: string) {
    return this.client.delete(`/leads/${id}`);
  }
  
  // Campaigns
  async getCampaigns(params?: CampaignQueryParams) {
    return this.client.get('/campaigns', { params });
  }
  
  async createCampaign(data: CreateCampaignData) {
    return this.client.post('/campaigns', data);
  }
  
  // Analytics
  async getDashboardStats(dateRange?: { startDate: string; endDate: string }) {
    return this.client.get('/analytics/dashboard', { params: dateRange });
  }
  
  async getLeadAnalytics(params?: any) {
    return this.client.get('/analytics/leads', { params });
  }
  
  async getCampaignAnalytics(params?: any) {
    return this.client.get('/analytics/campaigns', { params });
  }
  
  async getActivityFeed(params?: { page?: number; limit?: number }) {
    return this.client.get('/analytics/activity-feed', { params });
  }
  
  // Activities
  async getActivities(params?: ActivityQueryParams) {
    return this.client.get('/activities', { params });
  }
  
  async createActivity(data: CreateActivityData) {
    return this.client.post('/activities', data);
  }
  
  // Tasks
  async getTasks(params?: TaskQueryParams) {
    return this.client.get('/tasks', { params });
  }
  
  async createTask(data: CreateTaskData) {
    return this.client.post('/tasks', data);
  }
  
  async updateTask(id: string, data: UpdateTaskData) {
    return this.client.put(`/tasks/${id}`, data);
  }
  
  // Notes
  async getLeadNotes(leadId: string) {
    return this.client.get(`/leads/${leadId}/notes`);
  }
  
  async createNote(leadId: string, content: string) {
    return this.client.post(`/leads/${leadId}/notes`, { content });
  }
  
  // Tags
  async getTags() {
    return this.client.get('/tags');
  }
  
  async createTag(data: CreateTagData) {
    return this.client.post('/tags', data);
  }
  
  async addTagsToLead(leadId: string, tagIds: string[]) {
    return this.client.post(`/leads/${leadId}/tags`, { tagIds });
  }
}

export const apiClient = new APIClient();
```

**Tasks:**
- [ ] Create `api-client.ts` with axios setup
- [ ] Add request/response interceptors
- [ ] Implement token refresh logic
- [ ] Add error handling
- [ ] Create type definitions for API responses

---

#### **2. Authentication Context**
**Location:** `frontend/src/contexts/AuthContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const { data } = await apiClient.getCurrentUser();
          setUser(data.data.user);
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);
  
  const login = async (email: string, password: string) => {
    const { data } = await apiClient.login(email, password);
    const { user, tokens } = data.data;
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setUser(user);
  };
  
  const register = async (registerData: RegisterData) => {
    const { data } = await apiClient.register(registerData);
    const { user, tokens } = data.data;
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setUser(user);
  };
  
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };
  
  const refreshUser = async () => {
    const { data } = await apiClient.getCurrentUser();
    setUser(data.data.user);
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Tasks:**
- [ ] Create AuthContext with user state
- [ ] Implement login/register/logout
- [ ] Add token management
- [ ] Create useAuth hook
- [ ] Wrap App with AuthProvider

---

### **Day 3: Dashboard Integration** ⏳

#### **3. Connect Dashboard to Analytics API**
**Location:** `frontend/src/pages/Dashboard.tsx`

**Changes:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

function Dashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.getDashboardStats();
      return data.data;
    }
  });
  
  // Fetch activity feed
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const { data } = await apiClient.getActivityFeed({ limit: 10 });
      return data.data.activities;
    }
  });
  
  // Fetch recent leads
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: async () => {
      const { data } = await apiClient.getLeads({ page: 1, limit: 5 });
      return data.data.leads;
    }
  });
  
  if (statsLoading || activitiesLoading || leadsLoading) {
    return <DashboardSkeleton />;
  }
  
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Total Leads"
          value={stats.totalLeads}
          change={stats.leadsGrowth}
        />
        <StatsCard
          title="Active Campaigns"
          value={stats.activeCampaigns}
          change={stats.campaignsGrowth}
        />
        {/* ... more stats */}
      </div>
      
      {/* Activity Feed */}
      <ActivityFeed activities={activities} />
      
      {/* Recent Leads */}
      <RecentLeadsList leads={leads} />
    </div>
  );
}
```

**Tasks:**
- [ ] Install React Query (`@tanstack/react-query`)
- [ ] Replace mock data with API calls
- [ ] Add loading skeletons
- [ ] Handle errors with error boundaries
- [ ] Add refresh functionality

---

### **Day 4: Leads Page Integration** ⏳

#### **4. Connect Leads CRUD Operations**
**Location:** `frontend/src/pages/LeadsPage.tsx`

**Features:**
- [ ] Fetch leads list with pagination
- [ ] Implement search and filters
- [ ] Create new lead form
- [ ] Edit lead modal
- [ ] Delete lead confirmation
- [ ] Add tags to leads
- [ ] View lead details

**Example:**
```typescript
function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', page, search, status],
    queryFn: async () => {
      const { data } = await apiClient.getLeads({
        page,
        limit: 20,
        search,
        status: status || undefined
      });
      return data.data;
    }
  });
  
  const createMutation = useMutation({
    mutationFn: (newLead: CreateLeadData) => apiClient.createLead(newLead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully!');
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted!');
    }
  });
  
  return (
    <div>
      {/* Filters */}
      <LeadFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
      />
      
      {/* Leads Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <LeadsTable
          leads={data.leads}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
      
      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={data.pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

---

### **Day 5: Campaigns & Tasks** ⏳

#### **5. Connect Campaign Management**
- [ ] Campaign list with filters
- [ ] Create campaign form
- [ ] Campaign details page
- [ ] Campaign metrics/analytics
- [ ] Campaign status updates

#### **6. Connect Task Management**
- [ ] Task list with filters
- [ ] Create task modal
- [ ] Update task status
- [ ] Task assignments
- [ ] Overdue task tracking

---

### **Day 6-7: Polish & Testing** ⏳

#### **7. Error Handling**
**Create:** `frontend/src/components/ErrorBoundary.tsx`

```typescript
class ErrorBoundary extends Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**Tasks:**
- [ ] Add error boundaries
- [ ] Create error toast notifications
- [ ] Handle network errors
- [ ] Handle validation errors
- [ ] Add retry mechanisms

---

#### **8. Loading States**
**Tasks:**
- [ ] Create skeleton loaders for all pages
- [ ] Add button loading spinners
- [ ] Show progress indicators for long operations
- [ ] Implement optimistic updates where appropriate

---

#### **9. Testing & Bug Fixes**
**Tasks:**
- [ ] Test user registration flow
- [ ] Test login/logout flow
- [ ] Test token refresh
- [ ] Test all CRUD operations
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] Fix any bugs found

---

## 🛠️ **Required Dependencies**

```bash
# React Query for data fetching
npm install @tanstack/react-query

# Axios for HTTP requests
npm install axios

# Toast notifications
npm install sonner

# Form handling
npm install react-hook-form zod @hookform/resolvers
```

---

## 📁 **File Structure**

```
frontend/src/
├── lib/
│   ├── api-client.ts              ← API client (axios setup)
│   ├── query-client.ts            ← React Query config
│   └── types.ts                   ← TypeScript types
├── contexts/
│   └── AuthContext.tsx            ← Auth state management
├── hooks/
│   ├── useAuth.ts                 ← Auth hook
│   ├── useLeads.ts                ← Leads data hook
│   ├── useCampaigns.ts            ← Campaigns data hook
│   └── useAnalytics.ts            ← Analytics data hook
├── components/
│   ├── ErrorBoundary.tsx          ← Error handling
│   ├── LoadingSpinner.tsx         ← Loading states
│   └── Toaster.tsx                ← Toast notifications
└── pages/
    ├── Dashboard.tsx              ← Updated with real data
    ├── LeadsPage.tsx              ← Updated with real data
    ├── CampaignsPage.tsx          ← Updated with real data
    └── LoginPage.tsx              ← New login page
```

---

## 🎯 **Success Checklist**

### **Core Functionality:**
- [ ] User can register a new account
- [ ] User can login with email/password
- [ ] User stays logged in after refresh
- [ ] Token refresh works automatically
- [ ] User can logout

### **Dashboard:**
- [ ] Shows real analytics data
- [ ] Stats cards display correct numbers
- [ ] Activity feed shows recent activities
- [ ] Charts display real data
- [ ] Recent leads list works

### **Leads:**
- [ ] Can view list of leads
- [ ] Can search leads
- [ ] Can filter by status/source
- [ ] Can create new lead
- [ ] Can edit lead details
- [ ] Can delete lead
- [ ] Can add tags to lead
- [ ] Pagination works

### **Campaigns:**
- [ ] Can view campaigns
- [ ] Can create campaign
- [ ] Can update campaign status
- [ ] Can track campaign metrics

### **Tasks & Notes:**
- [ ] Can create tasks
- [ ] Can update task status
- [ ] Can add notes to leads
- [ ] Can view activity history

### **Error Handling:**
- [ ] Network errors show toast
- [ ] Validation errors display properly
- [ ] 404 errors handled
- [ ] 401 triggers login redirect
- [ ] Loading states everywhere

---

## 🚀 **Launch Readiness**

After Week 3, you'll have:
- ✅ Fully functional backend (54 endpoints)
- ✅ Connected React frontend
- ✅ User authentication
- ✅ Real-time data updates
- ✅ Error handling
- ✅ Production-ready MVP

**Next:** Deploy to production (Railway + Vercel) and get first users! 🎉

---

*Week 3 Plan - Frontend Integration*  
*Ready to Start: October 26, 2025*
