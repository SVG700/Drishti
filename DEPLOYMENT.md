# Deploying DRISHTI

The website **and** the AI backend deploy together as one Vercel project:

| Part | How it runs on Vercel | Config |
|---|---|---|
| Website (React + Vite + Cesium) | Static build from `dist/` | `vercel.json` |
| AI backend (FastAPI + Gemini, `AI-Backend/`) | Python serverless function `api/index.py`, on the same domain | `vercel.json`, root `requirements.txt` |

The website calls the backend on its own domain (`/health`, `/projects`,
`/analytics`, `/ai/...`), which `vercel.json` routes to `api/index.py`. No
backend URL needs configuring.

The **God's Eye** globe (gods-eye-view) cannot run on Vercel: it is a long-lived
server with live-data proxies. Host it separately (section 3) or the God's Eye
tab shows "server not reachable"; the rest of the site works without it.

---

## 1. Deploy to Vercel

1. In Vercel: **Add New → Project**, import this repository. Leave the root
   directory as the repository root. `vercel.json` sets the framework (Vite),
   build command, output folder and the Python function.
2. Add the environment variables below (Project → Settings → Environment
   Variables), then deploy.

| Variable | Required | Value |
|---|---|---|
| `GEMINI_API_KEY` | **Yes**, for AI answers | Your Gemini key. Server-side only (used by `api/index.py`, never sent to browsers). Without it the assistant answers in non-AI fallback mode |
| `GEMINI_MODEL` | Recommended | `gemini-3.5-flash` |
| `VITE_GODS_EYE_URL` | For the God's Eye tab | The hosted globe from section 3, e.g. `https://drishti-gods-eye.onrender.com/` |
| `VITE_CESIUM_ION_TOKEN` | Optional | Better terrain and imagery on the classic globe |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Google 3D tiles on the classic globe; restrict the key to your domain |
| `GEMINI_TIMEOUT_SECONDS`, `PAIMANA_SESSION_TTL_SECONDS`, `PAIMANA_MAX_SESSIONS`, `PAIMANA_MAX_SESSION_TURNS` | Optional | Defaults 30, 1800, 1000, 10 |

Do **not** set `VITE_API_BASE_URL` on Vercel; leaving it unset makes the site
use its own domain. Never give the Gemini key a `VITE_` name: `VITE_` values
are compiled into the public site. `VITE_` values are read at build time, so
redeploy after changing one.

3. After the deploy, open `https://<your-site>.vercel.app/health`. It should
   report `"status":"healthy"` and `"total_projects":2100`, and the site header
   should show **BACKEND: ONLINE**.

### How the backend behaves on Vercel

- **Cold starts:** the first request to a fresh function instance loads pandas
  and the 2,100-project dataset (a few seconds). Later requests are fast.
- **Function size:** about 220 MB of the 250 MB Python limit (mostly pandas and
  numpy). `vercel.json` keeps the repository's videos, PDFs, zips and frontend
  sources out of the function. Avoid adding heavy Python dependencies.
- **Time limit:** `maxDuration` is 60 s; Gemini calls time out at 30 s and fall
  back to the non-AI answer.
- **Assistant memory:** multi-turn conversation context lives in the
  function's memory. When Vercel routes a follow-up question to a different
  instance, the assistant answers it as a new conversation.

## 2. (Alternative) Backend on Render instead

To keep the backend on an always-on server instead (no cold starts, reliable
conversation memory), deploy `render.yaml` with **Render → New → Blueprint**,
enter `GEMINI_API_KEY` there, and set `VITE_API_BASE_URL` on Vercel to the
Render URL (https). The `api/` function then simply goes unused.

## 3. God's Eye (Render, Docker)

gods-eye-view lives in its own folder next to this repo
(`Drishti_Final/gods-eye-view`) and has to be pushed to its own GitHub
repository first. It already contains a `Dockerfile` and a `render.yaml`.

1. Push `gods-eye-view` to a new GitHub repository.
2. In Render: **New → Blueprint**, pick that repository. It creates
   `drishti-gods-eye` from the Dockerfile.
3. Set its variables, then set `VITE_GODS_EYE_URL` on Vercel and redeploy:

| Variable | Value |
|---|---|
| `GEV_ALLOWED_HOSTS` | The service's own host name, e.g. `drishti-gods-eye.onrender.com` (no `https://`) |
| `GEV_EMBED_FRAME_ANCESTORS` | The website's address, e.g. `https://drishti.vercel.app` (add custom domains, space-separated) |

Leave its own API keys (Google, OpenAI, AISStream...) unset on a public
deployment: the server spends whatever keys it holds on behalf of every visitor.
Without keys it still runs on its keyless map and data sources. If the free
plan's memory is too small (the service keeps restarting), use the starter plan.

---

## Checklist

- [ ] `https://<your-site>/health` reports healthy with 2,100 projects
- [ ] The site header shows **BACKEND: ONLINE**
- [ ] The AI Assistant answers with `answer_source: ai`
- [ ] Analytics and Reports load for project 400010
- [ ] The God's Eye tab shows the globe with the 41 project pins (after section 3)
