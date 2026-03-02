# 🦅 KESTREL – Frontend

**Biodiversity Monitoring & Ecological Reporting Platform**

Next.js web application for KESTREL — complete interface for biodiversity reporting, geospatial mapping with heatmaps, analytics dashboards, document management with approval workflow, community forums, and role-based admin management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Vanilla CSS + Custom Design System |
| HTTP Client | Axios (with JWT interceptors) |
| Maps | Leaflet + leaflet.heat (heatmap layer) |
| Charts | Chart.js + react-chartjs-2 |
| Notifications | react-toastify |
| Auth State | React Context API |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (font, AuthProvider, ToastContainer)
│   ├── page.tsx                  # Root redirect → /login or /dashboard
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx   # Token-based, reads ?token= from URL
│   ├── dashboard/page.tsx        # Stats, map (markers/heatmap toggle), charts, animal-wise table
│   ├── documents/page.tsx        # Document library — role-filtered upload & download
│   ├── officer/page.tsx          # Officer panel — upload docs, CSV, view submissions
│   ├── report/page.tsx           # Field Survey, Community Report, Bulk CSV upload
│   ├── analytics/page.tsx        # Charts + animal-wise sortable observation table
│   ├── admin/page.tsx            # 5-tab admin: reports, users, role requests, species, documents
│   ├── forum/page.tsx            # Community forum with posts & comments
│   └── profile/page.tsx         # Edit profile, avatar, role upgrade request
├── components/
│   ├── Sidebar.tsx               # Role-filtered navigation (user/officer/admin)
│   ├── ProtectedRoute.tsx        # Auth guard + role guard with loading state
│   ├── Modal.tsx                 # Portal modal (ESC + backdrop dismiss)
│   ├── MapPicker.tsx             # Leaflet click-to-place marker (SSR-safe)
│   ├── ChartWidget.tsx           # Chart.js wrapper (Bar / Line / Doughnut)
│   └── DataTable.tsx             # Generic typed table with custom cell renderers
├── context/
│   └── AuthContext.tsx           # Global auth state, login/register/logout
├── hooks/
│   └── useAuthForm.ts            # Login and register form hooks
├── lib/
│   ├── api.ts                    # Axios instance with JWT injection + 401 redirect
│   └── auth.ts                   # SSR-safe localStorage token helpers
└── types/
    └── index.ts                  # Full TypeScript interfaces (User, Species, Document, etc.)
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- KESTREL Backend running on `http://localhost:3001`

### Installation

```bash
git clone https://github.com/Kestrel-Biodiversity-Monitor/Kestrel-Frontend.git
cd kestrel-frontend
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Running

```bash
# Development
npm run dev        # → http://localhost:3000

# Production build
npm run build
npm start

# TypeScript check
npx tsc --noEmit
```

---

## Pages

| Route | Access | Description |
|-------|:------:|-------------|
| `/login` | Public | Email + password sign-in |
| `/register` | Public | Account creation with organisation field |
| `/forgot-password` | Public | Email reset request |
| `/reset-password` | Public | Token-based new password form |
| `/dashboard` | ✅ All | Stat cards, map (markers/heatmap), charts, alerts, animal-wise table |
| `/documents` | ✅ All | Approved docs for users; officers see own uploads + can upload |
| `/officer` | ✅ Officer+ | Upload documents, bulk CSV, view my submissions |
| `/report` | ✅ All | Field Survey (map picker + image), Community Report, Bulk CSV |
| `/analytics` | ✅ All | Species distribution, trends, conservation, regions, animal-wise table |
| `/admin` | ✅ Admin | Reports, users, role requests, species CRUD, document approval |
| `/forum` | ✅ All | Community posts with categories, comments, upvoting |
| `/profile` | ✅ All | Edit profile, avatar upload, officer role request, account stats |

---

## Role-Based Access

| Feature | User | Officer | Admin |
|---------|:----:|:-------:|:-----:|
| View approved documents | ✅ | ✅ | ✅ |
| Upload documents / CSV | ❌ | ✅ | ✅ |
| Submit field reports | ✅ | ✅ | ✅ |
| View Officer Panel (`/officer`) | ❌ | ✅ | ✅ |
| Approve / reject documents | ❌ | ❌ | ✅ |
| Approve / reject reports | ❌ | ❌ | ✅ |
| Manage users & roles | ❌ | ❌ | ✅ |
| Access Admin Panel (`/admin`) | ❌ | ❌ | ✅ |

---

## Key Components

### `Sidebar`
Role-aware navigation. Shows **Documents** and **Submit Report** for all roles. Shows **Officer Panel** for officer and admin. Shows **Admin Panel** for admin only. Displays the user's role badge, contribution score, and a sign-out button.

### `ProtectedRoute`
Wraps pages that require authentication. Redirects unauthenticated users to `/login`. Accepts an optional `requiredRole` prop (`"admin"` or `"officer"`) to restrict access. Redirects unauthorized roles to `/dashboard`.

```tsx
<ProtectedRoute requiredRole="officer">
  <OfficerPanel />
</ProtectedRoute>
```

### `MapPicker`
SSR-safe Leaflet map. Click anywhere to drop a pin. Emits `(lat, lng)` via `onLocationSelect` callback. Uses CartoDB light tile layer.

### `ChartWidget`
Thin wrapper around Chart.js. Supports `bar`, `line`, and `doughnut` chart types with the platform's earth-tone colour palette.

```tsx
<ChartWidget
  type="line"
  labels={["Jan", "Feb", "Mar"]}
  datasets={[{ label: "Reports", data: [12, 34, 28] }]}
/>
```

### `DataTable`
Generic fully-typed table. Accepts a `columns` array with optional `render` callbacks for custom cell content.

---

## Dashboard Overview

The `/dashboard` fetches and displays:

- **4 stat cards** — Total reports, Approved, Pending, Species tracked
- **Monthly trend chart** — Approved vs. Total submissions
- **Top reported species chart** — Top 8 species by report count
- **Observation map** with toggle:
  - **📍 Markers mode** — colour-coded circle markers by risk level
  - **🔥 Heatmap mode** — heat intensity overlay (green=Low → red=Critical) using `leaflet.heat`
- **Active alerts panel** — Info / Warning / Critical styled alert banners
- **🐾 Animal-Wise Observation Table** — sortable table of all species with report count, relative share bar, and activity status
- **Recent reports table** — Last 5 submissions with status badges

---

## Animal-Wise Data Table

Appears on both **Dashboard** (compact) and **Analytics** page (full featured):

- Sortable by **Species Name** or **Sightings** count (click column headers)
- Visual relative share progress bar per species
- Top 3 rows highlighted with 🥇🥈🥉 medals
- Activity status label: **High Activity** / **Moderate** / **Low Activity**

---

## Document Upload Workflow

1. **Officer** uploads a file via `/officer` (Upload Document tab) or `/documents`
2. Document is saved with `status: "pending"`
3. **Admin** sees pending documents in Admin Panel → Documents tab
4. Admin clicks **Approve** or **Reject** with an optional note
5. Approved documents become visible to all users on `/documents`
6. Users can **Download** any approved document

---

## Auth Flow

1. `AuthProvider` checks `localStorage` for a saved JWT on mount
2. If found, calls `GET /api/auth/me` to verify and hydrate user state
3. On 401 responses, the Axios interceptor clears the token and redirects to `/login`
4. All state is managed through `useAuth()` hook

```tsx
const { user, login, logout, isLoading } = useAuth();
```

---

## Design System

Handcrafted CSS design system in `globals.css`.

**Colour Palette**

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-forest` | `#1a4731` | Primary brand, sidebar, buttons |
| `--color-forest-light` | `#2d7a55` | Hover states, accents |
| `--color-forest-pale` | `#d1eadc` | Highlighted backgrounds |
| `--color-slate` | `#0f1e2d` | Sidebar background |
| `--surface-bg` | `#f5f7f5` | Page background |
| `--surface-card` | `#ffffff` | Card surface |

**Component classes** — `.card`, `.btn`, `.form-input`, `.badge`, `.data-table`, `.modal-overlay`, `.stat-card`, `.nav-item`, `.auth-card`, `.tabs`, `.alert-banner`

---

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL (e.g. `http://localhost:3001/api`) |

---

## License

MIT
