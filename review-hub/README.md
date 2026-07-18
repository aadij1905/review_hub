# Review Hub — Suggestion Review Dashboard

React-only (Vite) frontend for reviewing AI-generated storefront improvement
suggestions. Talks directly to the **Analytics Service** and **AI Service** in
this repo; suggestions and their review status persist in `localStorage`.

## Run

```bash
cd review-hub
npm install
npm run dev            # http://localhost:5173
```

## Personas / logins

| Username | Password  | Role      | Sees                                           |
| -------- | --------- | --------- | ---------------------------------------------- |
| `admin`  | `admin123`| PO / Admin| Full dashboard, approve/reject, Dev View Preview |
| `dev1`   | `dev123`  | Developer | Approved suggestions **with code patches**     |
| `dev2`   | `dev123`  | Developer | Same as dev1                                   |

## Flow

1. **PO logs in** → onboarding: enter the `*.myshopify.com` domain, install the
   extractor app, click **Sync to Dashboard**.
2. Sync triggers `shopify-pp` (extract → normalize → screenshots → ingest to
   Analytics), then the **AI Service** generates a report *without code* —
   problems, plain-English suggestions, effort, impact, confidence.
3. PO **approves / rejects**. Rejected are discarded; approved are stored.
4. **Developer logs in** → sees only approved suggestions, each with the
   technical issue, recommendation, and a ready-to-paste **code patch**.

## Service endpoints

Configured in [`src/lib/config.js`](src/lib/config.js):

| Service        | Default URL             |
| -------------- | ----------------------- |
| AI Service     | `http://localhost:5001` |
| Analytics      | `http://localhost:4000` |
| Shopify app    | `http://localhost:3000` |

If the services aren't running, the dashboard **falls back to an embedded demo
dataset** (mirrors `ai service 2/ai/mockSuggestions.js`) so it's always
demoable. The active data source is shown in the header (`ai` / `mock` / `demo`).

> Note: `shopify-pp` has no CORS middleware, so the browser sync call is
> best-effort — on failure the app still generates from whatever the Analytics
> Service has (or demo data).
