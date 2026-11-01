# Deploying DRISHTI

DRISHTI is three services. Only the website runs on Vercel; the other two need a
host that runs a long-lived server (this guide uses Render, which reads the
`render.yaml` files in each repository).

| Service | What it is | Host | Config |
|---|---|---|---|
| Website | React + Vite + Cesium (this repo's root) | Vercel | `vercel.json` |
| AI backend | FastAPI + Gemini (`AI-Backend/`) | Render (Python) | `render.yaml` |
| God's Eye | gods-eye-view, the globe shown in the God's Eye tab | Render (Docker) | `render.yaml` in the gods-eye-view repo |

Deploy in this order, because each later step needs the URL of an earlier one:
**1. AI backend → 2. God's Eye → 3. Website → 4. allow the website to embed God's Eye.**

---

## 1. AI backend (Render)

1. In Render: **New → Blueprint**, pick this repository. It finds `render.yaml`
   and creates `drishti-ai-backend` from the `AI-Backend/` folder
   (Python 3.14 from `AI-Backend/.python-version`).
2. When asked, enter **`GEMINI_API_KEY`** (from Google AI Studio). It is stored
   on Render only; never commit it or add it to Vercel.
3. After the deploy, open `https://<your-backend>.onrender.com/health`. It should
   report `"status":"healthy"` and `"total_projects":2100`.

| Variable | Required | Value |
|---|---|---|
| `GEMINI_API_KEY` | Yes, for AI answers | Your Gemini key (without it the assistant answers in non-AI fallback mode) |
| `GEMINI_MODEL` | Set by `render.yaml` | `gemini-3.5-flash` |
| `GEMINI_TIMEOUT_SECONDS` | Set by `render.yaml` | `30` (minimum 10) |
| `PAIMANA_SESSION_TTL_SECONDS`, `PAIMANA_MAX_SESSIONS`, `PAIMANA_MAX_SESSION_TURNS` | Optional | Defaults 1800, 1000, 10 |

The datasets ship in `AI-Backend/datasets/`, so no path variables are needed.
On Render's free plan the service sleeps when idle; the first request after a
pause takes up to a minute while it wakes.

## 2. God's Eye (Render, Docker)

gods-eye-view lives in its own folder next to this repo
(`Drishti_Final/gods-eye-view`) and has to be pushed to its own GitHub
repository first. It already contains a `Dockerfile` and a `render.yaml`.

1. Push `gods-eye-view` to a new GitHub repository.
2. In Render: **New → Blueprint**, pick that repository. It creates
   `drishti-gods-eye` from the Dockerfile.
3. Set its variables:

| Variable | Value |
|---|---|
| `GEV_ALLOWED_HOSTS` | The service's own host name, e.g. `drishti-gods-eye.onrender.com` (no `https://`) |
| `GEV_EMBED_FRAME_ANCESTORS` | The website's address from step 3, e.g. `https://drishti.vercel.app`. Fill it in after step 3 if you don't know it yet |

Leave its own API keys (Google, OpenAI, AISStream...) unset on a public
deployment: the server spends whatever keys it holds on behalf of every visitor.
Without keys it still runs on its keyless map and data sources.
If the free plan's memory is too small (the service keeps restarting), switch it
to the starter plan.

## 3. Website (Vercel)

1. In Vercel: **Add New → Project**, import this repository. Leave the root
   directory as the repository root. `vercel.json` sets the framework (Vite),
   build command (`npm run build`) and output folder (`dist`).
2. Add the environment variables below (Project → Settings → Environment
   Variables), then deploy.

| Variable | Required | Value |
|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | Backend URL from step 1, e.g. `https://drishti-ai-backend.onrender.com` |
| `VITE_GODS_EYE_URL` | **Yes**, for the God's Eye tab | God's Eye URL from step 2, e.g. `https://drishti-gods-eye.onrender.com/` |
| `VITE_CESIUM_ION_TOKEN` | Optional | Better terrain and imagery on the classic globe |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Google 3D tiles on the classic globe; restrict the key to your Vercel domain |

`VITE_` values are compiled into the public site, so they must never hold the
Gemini key or any other private secret. They are read at build time: after
changing one, redeploy.

`vercel.json` also forwards the classic globe's place search (`/api/nominatim`)
to OpenStreetMap, replacing the proxy the local dev server provides.

## 4. Allow the website to embed God's Eye

Set `GEV_EMBED_FRAME_ANCESTORS` on the God's Eye service to the website's real
address (and any custom domain, space-separated), then redeploy it. Until this
matches, the God's Eye tab shows "God's Eye server not reachable".

---

## Checklist

- [ ] `https://<backend>/health` reports healthy with 2,100 projects
- [ ] The website header shows **BACKEND: ONLINE**
- [ ] The AI Assistant answers with `answer_source: ai`
- [ ] The God's Eye tab shows the globe with the 41 project pins
- [ ] All three URLs use `https://` (browsers block an https site from calling http)
