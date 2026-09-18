# Frontend structure (aligned with Nandighosh Medical)

```
client/src/
├── api/                 # Axios client
├── components/
│   ├── auth/            # ProtectedRoute, PermissionGate
│   ├── ui/              # Button, Card, … (shared primitives)
│   └── …                # domain components (CrudPage, Icons, …)
├── constants/           # App-wide constants
├── layouts/             # DashboardLayout, AuthLayout
├── lib/                 # utils (cn, formatters)
├── pages/
│   ├── auth/            # Login, Register, Select institute
│   └── …                # Feature pages (students, fees, …)
├── store/               # Redux (auth, ui)
├── App.jsx
├── main.jsx
└── index.css            # Tailwind v3 + design tokens
```

Tailwind: `tailwind.config.js` + `postcss.config.js` (same pattern as nandighoshmedical-frontend).
