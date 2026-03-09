# Action Items: Missing Persistence Implementation

## What “persistence” means here

**Persistence** = action items are stored on the **server** (database) and loaded/saved via an **API**, so they:

- Survive clearing browser data or using another device
- Can be shared or scoped per user/team
- Use server-generated IDs and timestamps

---

## What exists today (no server persistence)

| Where | What |
|-------|------|
| **Storage** | Single key in **localStorage**: `action-items-persisted` |
| **Shape** | One JSON object: `{ tableItems: TableRow[], ticketDetails: Record<number, TicketDetail> }` |
| **Load** | On mount: `loadActionItemsFromStorage()` → if missing, use `DEFAULT_TABLE_ITEMS` (mock rows) |
| **Save** | On every state change: `saveActionItemsToStorage(tableItems, ticketDetails)` in a `useEffect` |

So all data is **per browser, per origin**. Different device or “Clear site data” = data gone. There is **no backend** for action items.

---

## What’s missing (to have real persistence)

### 1. Backend (Django)

- **Models**
  - e.g. `ActionItem` with: user (FK), product_id/asin (or FK to Product), category, subject, status, assignee, due_date, description (or HTML), created_at, updated_at.
  - Optional: `ActionItemAttachment` (FK to ActionItem, file path or URL, name, uploaded_at).
- **API**
  - `GET /api/v1/action-items/` — list (filter by status, category, product; pagination).
  - `POST /api/v1/action-items/` — create.
  - `GET /api/v1/action-items/:id/` — get one (full detail including description, attachments).
  - `PATCH /api/v1/action-items/:id/` — update (status, assignee, due_date, description, etc.).
  - `DELETE /api/v1/action-items/:id/` — delete.
- **Auth & scope**
  - All endpoints require auth; list/create/update/delete scoped to `request.user` (or to a team if you add one later).

### 2. Frontend (Next.js)

- **API client** (`lib/api.ts`)
  - Add methods: `getActionItems()`, `getActionItem(id)`, `createActionItem()`, `updateActionItem()`, `deleteActionItem()` calling the endpoints above.
- **Action items UI** (`components/actions/action-items.tsx`)
  - **Load**: On mount (and when filters change), call `api.getActionItems(...)` instead of `loadActionItemsFromStorage()`. Map API response to `tableItems` and `ticketDetails`.
  - **Create**: On “Create Action Item”, call `api.createActionItem(...)` then append the returned item to state (or refetch list).
  - **Update**: On status/assignee/due date/description/attachments change, call `api.updateActionItem(id, ...)` and then update local state or refetch.
  - **Delete**: On delete, call `api.deleteActionItem(id)` and remove from state or refetch.
  - **Optional**: Keep a small amount of localStorage (e.g. filters or “draft”) if useful, but **list and detail** come from the API.
- **IDs**
  - Use server IDs (e.g. integer or UUID) instead of client-only `Math.max(...)+1`. Table row `id` and ticket detail key become the server ID.

### 3. Attachments (already partially done)

- Upload is already implemented: file → `POST /api/action-items/attachments` → store returned `url` in the item.
- For **full** persistence, attachment URLs are stored **on the action item** in the backend (e.g. JSON array or related `ActionItemAttachment` rows). So when you PATCH an action item, you send `attachments: [{ name, url, uploadedAt }]` (and optionally later an attachment ID from the server).

---

## Data flow comparison

| Step | Today (localStorage) | With persistence (API) |
|------|----------------------|--------------------------|
| Load list | `localStorage.getItem('action-items-persisted')` | `GET /api/v1/action-items/` |
| Create item | Append to state → `useEffect` saves to localStorage | `POST /api/v1/action-items/` → add to state or refetch |
| Update item | Update state → `useEffect` saves to localStorage | `PATCH /api/v1/action-items/:id` → update state or refetch |
| Delete item | Remove from state → `useEffect` saves to localStorage | `DELETE /api/v1/action-items/:id` → remove from state or refetch |
| IDs | Client: `Math.max(0, ...ids) + 1` | Server: e.g. `id: 42` from API |

---

## How to test: working vs not working

### Prerequisites

- **Next.js** running (`npm run dev`) so the app and `/api/action-items/attachments` are available.
- **Logged in** so “Created by” and product list (Django) work.
- **Django backend** running if you want **real products** in the product picker; otherwise the product dropdown may show “No products in your catalog” or an error.

---

### 1. LocalStorage persistence (current behavior)

| Test | Expected (working) | Not working |
|------|--------------------|-------------|
| **Save** | Add or edit an item → refresh the page → same items and details appear. | After refresh, list is empty or back to mock data. |
| **Check storage** | DevTools → Application → Local Storage → your origin → key `action-items-persisted` has a JSON object with `tableItems` and `ticketDetails`. | Key missing or empty. |
| **Clear storage** | Delete `action-items-persisted` → refresh → list shows default mock rows (or empty if no default). | App crashes or behaves oddly. |

So: **working** = changes survive refresh in the same browser; **not working** = data doesn’t survive or key never appears.

---

### 2. Product picker (real products from API)

| Test | Expected (working) | Not working |
|------|--------------------|-------------|
| **Open Add** | Click “Add” / new action item → product dropdown shows “Loading products…” then your real products (or “No products in your catalog.” if backend has none). | Stuck on “Loading products…”, or error message, or only old mock products. |
| **Backend down** | With Django stopped, dropdown shows an error (e.g. “Failed to load products”). | Crash or no feedback. |

**Working** = list comes from API (or clear “no products” message); **not working** = infinite loading, wrong data, or no error when API fails.

---

### 3. Created by (current user)

| Test | Expected (working) | Not working |
|------|--------------------|-------------|
| **Create item** | Create a new action item → open its detail → “Created by” shows your name (and initials). | Shows “—” or “Christian R.” / “CR”. |
| **Logged out** | If you’re not logged in, “Created by” can be “—” or fallback. | Crash when opening or creating. |

**Working** = your user name appears as creator; **not working** = wrong or generic name.

---

### 4. Attachments (upload API)

| Test | Expected (working) | Not working |
|------|--------------------|-------------|
| **Upload** | Add attachment → choose file → file appears in the list with name and “Uploaded [date]”. | Toast error (“Failed to upload …”) or nothing happens. |
| **After refresh** | Refresh page → open the same item → attachment still there; link opens or downloads. | Attachment gone or link broken (e.g. 404). |
| **Remove** | Click remove on an attachment → it disappears from the item. | Doesn’t remove or errors. |

**Working** = upload succeeds, attachment survives refresh, remove works; **not working** = upload fails, or attachment lost on refresh, or remove broken.

Quick check: DevTools → Network → upload a file → request to `POST /api/action-items/attachments` returns **200** and body `{ url: "...", name: "..." }`. If you get 4xx/5xx or no request, upload is not working.

---

### 5. Persistence (future API) – not implemented yet

Today there is **no** server persistence. So:

- **Working (current)** = data only in localStorage: same device/browser keeps data; other device or “Clear site data” removes it.
- **Not implemented** = no Django action-items API; no GET/POST/PATCH/DELETE for action items. When you add them later, you’d test by: calling the API (e.g. with curl or a test), then checking DB and UI that list/detail match the API.

---

## Summary

- **Implemented**: Backend `ActionItem` model and CRUD at `/api/v1/action-items/`; frontend loads/saves via `api.getActionItems()`, `createActionItem()`, `updateActionItem()`, `deleteActionItem()`; server IDs; loading/error/empty states.
- **Note**: List is paginated (DRF default PAGE_SIZE 20). For 20+ items, add pagination UI or increase page size for this endpoint if needed.
