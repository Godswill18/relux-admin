# Relux Laundry — Admin Dashboard

Staff and Superadmin web app for Relux Laundry: orders, customers, payments,
staff, delivery, announcements and settings. React + Vite + TypeScript,
Tailwind and shadcn/ui, Zustand for state.

## Develop

Requires Node.js and npm.

```sh
npm install
npm run dev      # dev server
npm run build    # production build into dist/
```

The API address comes from `VITE_API_URL` (see `.env`).

## Deploy

The `Dockerfile` builds the app with npm and serves `dist/` through nginx.
