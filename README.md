# கற்போம் கசடற — Karpom Kasadara
### Tamil Language Learning Portal

---

## Phase 1 Setup

### Prerequisites
- Node.js 18+
- npm 9+
- A Supabase project (DB + Storage)
- Upstash Redis database
- Resend API key

### 1. Clone and install

```bash
git clone https://github.com/YOUR-USERNAME/Karpom-Kasadara.git
cd Karpom-Kasadara
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Fill in all values in `server/.env` from your Supabase, Upstash and Resend dashboards.

### 3. Set up the database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed creates two admin accounts:
- **Anto** — anto.libin@gmail.com (password from ADMIN_PASSWORD env var)
- **Udhaya** — karpomkasadaralanguages@gmail.com (password from ADMIN2_PASSWORD env var)

⚠️ Change both passwords after first login.

### 4. Run locally

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

---

## Project Structure

```
karpom-kasadara/
├── client/          # React SPA (Vite + Tailwind)
│   └── src/
│       ├── pages/   # Route components
│       ├── components/
│       ├── store/   # Zustand state
│       └── api/     # Axios instance
└── server/          # Node.js Express API
    └── src/
        ├── routes/
        ├── middleware/
        ├── services/
        └── config/
    └── prisma/      # Database schema & migrations
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Vite |
| Viewer | PDF.js |
| Annotations | HTML5 Canvas (native) |
| Backend | Node.js, Express |
| Database | Supabase PostgreSQL (Prisma ORM) |
| File Storage | Supabase Storage |
| Job Queue | BullMQ + Upstash Redis |
| Email | Resend |
| Auth | JWT + bcrypt |
