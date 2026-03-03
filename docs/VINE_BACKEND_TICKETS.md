# Vine Feature – Backend-Focused Feature Tickets

Backlog of backend work for the Vine (Amazon Vine program tracking) feature. Current stack: Django REST Framework, `analytics_app.VineClaim`, `VineClaimViewSet`, forecast integration via `get_vine_claims_data()`.

---

## 1. Vine list API: pagination and response contract

**Priority:** High  
**Area:** API contract, performance

- **Current:** Vine list uses global `PageNumberPagination`; frontend expects either a plain array or `{ results: [] }`.
- **Tasks:**
  - Document and stabilize response shape (list vs paginated) for `GET /api/v1/vine-claims/`.
  - Either:
    - Use a Vine-specific pagination class with a large default `page_size` (e.g. 500) and document it, or
    - Add a query param (e.g. `?no_pagination=1`) to return all vine claims for the user in one response for the dashboard.
  - Ensure frontend and backend agree on one contract so dashboard and future pagination both work.

**Acceptance:** Documented contract; dashboard can load all vine data in one call without breaking future pagination.

---

## 2. Vine summary / aggregate endpoint

**Priority:** High  
**Area:** API, performance

- **Current:** Dashboard computes totals (e.g. active vine products, total units claimed, total enrolled, recent claims) from the full vine-claims list.
- **Tasks:**
  - Add `GET /api/v1/vine-claims/summary/` (or `.../stats/`) returning:
    - Count of distinct products with at least one vine claim (or with `vine_units_enrolled` > 0).
    - Sum of `units_claimed` across all user’s claims.
    - Sum of enrolled units (from ProductExtended) for products that have claims or enrolled > 0.
    - Optional: count of claims with `review_received=False` (awaiting reviews) vs `True` (concluded).
  - Use DB aggregation (`Count`, `Sum`) so the dashboard can use this instead of aggregating a large list.

**Acceptance:** Single summary endpoint; dashboard summary cards can use it and avoid loading full list for stats.

---

## 3. Bulk create/update Vine claims

**Priority:** Medium  
**Area:** API, validation

- **Current:** Only single create/update and `set-status` (bulk `review_received` by product) exist.
- **Tasks:**
  - Add `POST /api/v1/vine-claims/bulk/` (or `bulk_create/`) that accepts a list of claim payloads for one or more products.
  - Validate in one go: total `units_claimed` per product must not exceed `product.extended.vine_units_enrolled`.
  - Support idempotency by `(product_id, claim_date)` or return created/updated IDs.
  - Optionally support bulk PATCH (e.g. update `review_received`/`review_date` for a list of claim IDs).

**Acceptance:** Client can create/update many claims in one request with consistent validation and clear errors.

---

## 4. Vine export (CSV/Excel)

**Priority:** Medium  
**Area:** API, reporting

- **Current:** No export endpoint; only management command for import.
- **Tasks:**
  - Add `GET /api/v1/vine-claims/export/` with query params: optional `product`, `claim_date_after`, `claim_date_before`, `review_received`, format `csv` or `xlsx`.
  - Stream CSV or generate Excel (e.g. openpyxl) with columns: product ASIN/name, claim_date, units_claimed, review_received, review_date, review_rating, notes.
  - Respect user scoping (only current user’s products); apply same filters as list endpoint.
  - Set appropriate `Content-Disposition` and content type.

**Acceptance:** User can export filtered vine claims as CSV or Excel from the API.

---

## 5. Vine import (CSV/Excel) via API

**Priority:** Medium  
**Area:** API, data ingestion

- **Current:** `seed_vine_claims` management command reads Excel and creates/updates VineClaims.
- **Tasks:**
  - Add `POST /api/v1/vine-claims/import/` that accepts file upload (multipart: CSV or Excel).
  - Reuse/refactor parsing and mapping logic from `seed_vine_claims` (ASIN → product, Vine_Status → review_received, dates, units, etc.).
  - Map rows to current user’s products by ASIN; skip or report rows for unknown ASINs.
  - Validate enrolled cap per product during import; return a summary (created, updated, skipped, errors).
  - Optionally support “clear existing for these products before import” via a query param.

**Acceptance:** Authenticated user can upload a file and get vine claims created/updated with a clear result summary.

---

## 6. Scheduled Vine data sync (Celery)

**Priority:** Low (research first)  
**Area:** Background jobs, integrations

- **Current:** Vine data is manual and/or from Excel import; no SP-API Vine sync.
- **Tasks:**
  - Research whether Amazon SP-API (or Reports API) exposes Vine enrollment or Vine claim/review data.
  - If yes: add a Celery task (e.g. `sync_vine_data`) to pull Vine-related data and update `VineClaim` and/or `ProductExtended.vine_units_enrolled`; schedule via Celery Beat (e.g. daily).
  - If no: document “no Vine API in SP-API” and keep Vine as manual/import-only; optionally add a “last_imported_at” or “source” field for clarity.

**Acceptance:** Decision documented; if an API exists, scheduled sync is implemented and non-destructive to manual edits (or policy documented).

---

## 7. Vine validation: enrollment cap and reconciliation

**Priority:** High  
**Area:** Data integrity, API

- **Current:** Serializer validates that total claimed ≤ `vine_units_enrolled` on create/update.
- **Tasks:**
  - Ensure validation runs on bulk create/update (ticket 3) and on import (ticket 5).
  - Add a “reconcile” flow when `ProductExtended.vine_units_enrolled` is reduced below current total claimed:
    - Option A: Prevent reducing enrolled below current total (admin/API validation).
    - Option B: Allow reduction and add a management command or admin action that caps or flags claims (e.g. set excess claims to a “over_enrolled” state or adjust units_claimed).
  - Expose a simple “validation summary” for a product (e.g. total claimed vs enrolled) in API or admin.

**Acceptance:** Enrolled cap is enforced everywhere; behavior when enrolled is reduced is defined and implemented.

---

## 8. Vine filtering and ordering

**Priority:** Medium  
**Area:** API

- **Current:** Filters: `product`, `review_received`. Ordering: `claim_date`, `units_claimed`, `id`.
- **Tasks:**
  - Add date range filters: `claim_date_after`, `claim_date_before` (ISO date).
  - Optional: search by product name or ASIN (e.g. `search=...` that filters by `product__name__icontains` or `product__asin`).
  - Document all query params and default ordering in API docs or OpenAPI.

**Acceptance:** Clients can filter vine claims by date range and optionally by product search; documented.

---

## 9. Audit / history for Vine changes

**Priority:** Low  
**Area:** Compliance, auditability

- **Tasks:**
  - Evaluate django-simple-history (or similar) for `VineClaim` to keep history of create/update/delete.
  - If adopted: ensure history is user-scoped (only history for current user’s products); expose “history” in admin only, or add optional `GET /api/v1/vine-claims/<id>/history/` for support.

**Acceptance:** Decision documented; if history is required, implementation is scoped and done.

---

## 10. Forecast cache invalidation when Vine changes

**Priority:** High  
**Area:** Forecast integration

- **Current:** Forecast service reads vine claims via `get_vine_claims_data(product)`; algorithms use them for 0–6m.
- **Tasks:**
  - When VineClaims are created, updated, or deleted for a product, invalidate or recompute forecast cache for that product (e.g. signal or explicit call to forecast service/cache).
  - Optionally trigger a Celery task to recompute forecast for the affected product(s) so next forecast read is up to date.
  - Document in ARCHITECTURE or IMPLEMENTATION_GUIDE that Vine changes affect forecast and how cache is updated.

**Acceptance:** Changing vine claims for a product updates (or invalidates) that product’s forecast cache; no stale “with old vine” forecasts.

---

## 11. Rate limiting / throttling for Vine writes

**Priority:** Medium  
**Area:** Security, reliability

- **Tasks:**
  - Apply throttling (e.g. DRF throttle classes or django-ratelimit) to vine write endpoints: create, update, delete, bulk, set-status, import.
  - Use stricter limits for import and bulk to avoid abuse (e.g. 10 imports per hour, 100 bulk creates per minute).
  - Return 429 with Retry-After when exceeded; document in API docs.

**Acceptance:** Vine write and import endpoints are rate-limited; limits are documented.

---

## 12. Vine dashboard endpoint (product-centric with claims)

**Priority:** Medium  
**Area:** API, performance

- **Current:** Frontend loads vine claims list and builds “vine products” by grouping by product; may require extra product or extended data.
- **Tasks:**
  - Add `GET /api/v1/vine-claims/dashboard/` (or `vine-products/`) that returns:
    - One row per product that has at least one vine claim or has `vine_units_enrolled` > 0.
    - Per product: product id, ASIN, name, SKU, brand, launch_date, vine_units_enrolled, and aggregated claim stats (total claimed, count of claims, count awaiting review, latest claim_date).
    - Optionally nested list of claims per product (or only for a “detail” view).
  - Implement with efficient queries (annotate/aggregate, minimal N+1); user-scoped.
  - Frontend can switch to this endpoint for the main Vine table to reduce round-trips and client-side grouping.

**Acceptance:** Single dashboard endpoint powers Vine table and summary; fewer requests and no N+1.

---

## Summary

| #  | Ticket                                      | Priority | Area              |
|----|---------------------------------------------|----------|-------------------|
| 1  | Vine list pagination & response contract    | High     | API, performance  |
| 2  | Vine summary / aggregate endpoint           | High     | API, performance  |
| 3  | Bulk create/update Vine claims              | Medium   | API, validation   |
| 4  | Vine export (CSV/Excel)                     | Medium   | API, reporting    |
| 5  | Vine import via API (CSV/Excel upload)      | Medium   | API, ingestion    |
| 6  | Scheduled Vine data sync (Celery)           | Low      | Background, SP-API|
| 7  | Enrollment cap validation & reconciliation  | High     | Data integrity    |
| 8  | Vine filtering (date range, search)         | Medium   | API               |
| 9  | Audit/history for Vine changes              | Low      | Compliance        |
| 10 | Forecast cache invalidation on Vine change | High     | Forecast          |
| 11 | Rate limiting for Vine writes               | Medium   | Security          |
| 12 | Vine dashboard (product-centric) endpoint   | Medium   | API, performance  |

Recommended order for backend focus: **7 → 10 → 1 → 2** (integrity and forecast first, then list contract and summary), then **12, 3, 8, 11**, then **4, 5**; **6** and **9** after product prioritization.
