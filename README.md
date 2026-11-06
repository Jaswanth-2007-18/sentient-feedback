# Sentient – Feedback Management System
### React + Vite Project

A full-featured feedback management platform with Admin & User modules, built with **React 18 + Vite 5**.

---

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# Open: http://localhost:5173
```

---

## 🏗️ Build for Production

```bash
npm run build
# Output: dist/
```

---

## 🌐 Deploy on Vercel

### Option A – Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B – Vercel Dashboard (Recommended)
1. Push this project to **GitHub** (or GitLab / Bitbucket)
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your repository
4. Settings (auto-detected):
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy** ✅

---

## 🔑 Demo Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | `admin`  | `admin123` |
| User  | `user`   | `user1234` |

---

## 📁 Project Structure

```
sentient-react/
├── index.html              # Vite entry
├── vite.config.js
├── package.json
├── vercel.json             # Vercel deployment config
└── src/
    ├── main.jsx            # React root
    ├── App.jsx             # Auth router
    ├── index.css           # All styles (merged)
    ├── pages/
    │   ├── AuthPage.jsx    # Login / Signup / Forgot Password
    │   ├── AdminApp.jsx    # Admin Dashboard (Overview, Feedbacks, Analytics, Surveys, Submit)
    │   └── UserApp.jsx     # User Dashboard (Home, Submit, My Feedbacks, Profile)
    └── utils/
        ├── storage.js      # LocalStorage CRUD helpers
        └── mockData.js     # Mock feedback data & stat computations
```

---

## ✨ Features

- **Auth** – Login, Signup, Forgot/Reset Password (LocalStorage)
- **Admin Module** – KPI cards, Charts (Chart.js), Feedback list with filters, Analytics, Surveys, Export CSV
- **User Module** – Submit feedback, Track status, Profile page
- **Role-based routing** – Admin → Dashboard, User → User panel
- **Fully responsive** – Mobile sidebar with hamburger menu
- **Data persistence** – All data stored in browser LocalStorage
