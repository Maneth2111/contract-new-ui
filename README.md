# Contract Management UI (Mock Data)

Same UI as the original **frontend-contract-management** app, but all API calls are served from local mock data — no backend required.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Mock login

Any email and password work. Example:

- Email: `ponlouer.ouy@chokchey.com.kh`
- Password: any value

After login you are treated as **Ouy Ponlouer** (administrator) with full permissions.

## Configuration

| Variable | Description |
|----------|-------------|
| `VITE_USE_MOCK=true` | Use mock API (default in `.env.local`) |
| `VITE_USE_MOCK=false` | Call real backend at `VITE_API_BASE_URL` |

Mock seed data lives in `src/data/mockData.ts`. Route handlers are in `src/api/mockHandlers.ts`.

Service function names and endpoint paths (`/contracts`, `/users`, `/departments`, etc.) are unchanged from the original project.
