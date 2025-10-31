# OrderEasy — Software Design Document (v0.1)

## 1) Overview (what we’re building)
OrderEasy lets dine-in guests scan a table QR, view the menu, place orders, and watch live prep status. It’s a **companion** to the restaurant’s POS (we don’t replace their POS for MVP).

---

## 2) Goals & Non-Goals
**Goals (MVP)**
- QR → Menu → Cart → Submit Order.
- Kitchen sees a simple ticket board: `NEW → IN_PREP → READY → SERVED`.
- Guests see live order status with a friendly step timeline (e.g., *“Gathering ingredients → Chopping → Sautéing → Plating”*).
- Accessibility basics: good contrast, keyboard support, ARIA live regions.

**Non-Goals (for now)**
- Payments.
- Full POS integration (we’ll prepare for it, but not build it yet).
- Delivery/curbside.

---

## 3) Users & Stories (plain language)
**Guest**
- “As a guest, I scan a QR and see today’s menu.”
- “I can add items, see totals, and submit without creating an account.”
- “I can track my order status in real time.”

**Kitchen**
- “As kitchen staff, I see a list of incoming tickets.”
- “I can change status to IN_PREP, READY, and SERVED.”

**Manager**
- “As a manager, I can toggle items ‘86’d’ (temporarily unavailable).”
- “I can print or download table QRs.”

---

## 4) MVP Checklist
- [ ] Menu browse + categories  
- [ ] Add to cart / edit quantities  
- [ ] Submit order (no payment)  
- [ ] Live status (socket updates)  
- [ ] Kitchen board status changes  
- [ ] “86” toggle for items  
- [ ] Table QR generator (per table)

---

## 5) UX Flows (high level)
**Guest:** Scan QR → Menu → Pick items → Cart → Confirm → Status screen.  
**Kitchen:** Login → Ticket board → Click ticket → Set status → Done.  
**Manager:** Login → Menu admin → Toggle availability → QR tools.

---

## 6) Accessibility Plan (a11y)
- Color contrast ≥ 4.5:1; base text ≥ 16px.  
- All actions keyboard-reachable (logical tab order + visible focus).  
- Status updates announced via `aria-live="polite"`.  
- Respect OS “reduced motion” preference for animations.

---

## 7) Architecture (simple)
- **Web (React + Vite + Tailwind):** guest/kitchen UI.  
- **API (Node + Express + Socket.IO):** menu + orders + real-time events.  
- **DB (Postgres):** hosted (Railway).  
- **Sockets:** order created/updated events to keep UIs live.


---

## 8) Data Model (tables)
- **Restaurant**(id, name)
- **Table**(id, restaurant_id, code)
- **Category**(id, name, sort)
- **MenuItem**(id, category_id, name, description, price_cents, is_available)
- **Order**(id, table_id, status: NEW|IN_PREP|READY|SERVED, created_at)
- **OrderItem**(id, order_id, menu_item_id, qty, notes)
- **OrderEvent**(id, order_id, status, created_at) ← keeps status history for the timeline

---

## 9) API (MVP)
**GET** `/menu` → categories + available items.  

**POST** `/orders` → create order  
```json
{
  "tableCode": "A12",
  "items": [
    { "menuItemId": 1, "qty": 2, "notes": "no onions" }
  ]
}

---

## 10) “Live prep” timeline (engagement)
- **Trigger** — when an order enters `IN_PREP`.
- **Display** — time-based stepper (e.g., `Gathering → Chopping → Sautéing → Plating`).
- **Timing** — split the estimated `IN_PREP` duration (e.g., ~20 min) evenly across steps.
- **Progress** — advance steps via timers; show percent + current step label.
- **Purpose** — UX helper only; not per-item kitchen telemetry.

---

## 11) POS Strategy (companion first)
- **MVP** — staff may manually key orders into the restaurant’s POS (common practice with platform orders).
- **Outbound** — emit a webhook on `order.created` with order payload for future adapters.
- **Adapters** — one adapter per POS (e.g., Toast, Square, Clover); translate OrderEasy → POS schema.
- **Reliability** — retries, exponential backoff, and a dead-letter queue for failed deliveries.
- **Security** — HMAC signature on webhooks; POS credentials stored as environment secrets.

---

## 12) Hosting & Environments
- **Host** — Railway (free tier).
- **Environments** — `dev` (shared testing), `main` (demo).
- **Runtime** — Node 20 for API; static build for Web on CDN edge.
- **Secrets** — set via Railway variables (`DATABASE_URL`, `JWT_SECRET`, etc.); never commit `.env`.
- **Monitoring** — basic logs + uptime pings; add metrics later.

---

## 13) Branching & Naming (proposal)
- **Permanent branches** — `main` (protected, demo-ready), `dev` (integration).
- **Lanes** — `frontend/`, `backend/`, `ui/` prefixes for short-lived feature branches.
- **Pattern** — `<lane>/<task>-<item>` (e.g., `frontend/feat-menu-page`).
- **Flow** — feature → lane → `dev` → `main` (PRs; squash merge).
- **Commits** — Conventional Commits (e.g., `feat(api): add POST /orders`).

---

## 14) CI/CD (light)
- **Trigger** — on PRs targeting `dev` or `main`.
- **Build** — if `web/` or `api/` exist: `npm ci` → `npm run build --if-present`.
- **Checks** — fail fast on build errors; surface logs in PR.
- **Deploy (later)** — auto-deploy `main` to Railway; `dev` to a preview instance.

---

## 15) Risks & Mitigations
- **Scope creep** — enforce MVP checklist; backlog everything else.
- **Adoption** — keep kitchen UI minimal; add shortcuts/tooltips after feedback.
- **Network** — Socket.IO auto-reconnect; add manual “Refresh status”.
- **Data integrity** — validate payloads; required fields; defensive defaults.
- **Privacy** — no PII beyond table code; purge demo data regularly.

---

## 16) Definition of Done (DoD)
- **Functionality** — all MVP items implemented and tested.
- **Accessibility** — keyboard nav, focus states, contrast, `aria-live` announcements verified.
- **Quality** — CI green; lint clean; no console errors in happy path.
- **Demo** — scripted path works end-to-end: scan → order → live status → kitchen flip → ready.

---

## 17) Milestones (2 sprints)
- **Sprint 1 (backbone)** — 
- **Sprint 2 (polish)** — 

---

## 18) Glossary (quick refs)
- **86** — temporarily mark an item unavailable.
- **Socket** — a persistent connection for instant updates (via WebSockets).
- **MVP** — smallest usable version we can demo and learn from.
- **Companion** — sits next to the POS; does not replace it.
