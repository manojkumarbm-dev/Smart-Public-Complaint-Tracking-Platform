# Smart Public Complaint Tracking Platform

Project ID: PRJ_364
Domain: Cloud Computing & Mobile Applications
SDG: SDG 11 – Sustainable Cities and Communities

This is a standalone Vite + React application for reporting civic issues and tracking their resolution. Citizens can submit complaints with photos and GPS location, while administrators can review, assign, update status, and monitor complaint trends.

## Overview

The Smart Public Complaint Tracking Platform helps communities capture local problems such as potholes, garbage overflow, water leaks, streetlight failures and damaged civic infrastructure. The app stores complaint records in browser local storage for a fully standalone local demo, making it easy to run and test in VS Code without external services.

## Features

- Citizen registration and login
- Admin login with seeded administrator access
- Complaint submission with title, category, description, image, and GPS location
- Geo-tagging and location capture
- Complaint tracking dashboard for citizens
- Admin dashboard with users, complaints, map view, and analytics
- Status updates, comments, notifications, and department assignment
- Admin-configurable stage timelines with deadline tracking and escalation history
- Image preview and local file upload simulation
- Fully local runtime without Base44 or external backend requirements

## Tech Stack

- React 18
- Vite
- React Router
- Tailwind CSS
- TanStack Query
- Lucide Icons
- LocalStorage data persistence

## Project Identity

- Name: Smart Public Complaint Tracking Platform
- Project ID: PRJ_364
- Domain: Cloud Computing & Mobile Applications
- SDG: SDG 11 – Sustainable Cities and Communities

## Local Demo Accounts

Use your local environment variables to define the seeded admin credentials. A sample configuration is provided in `.env.example`.

- Admin: set via `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD`
- Citizen: `citizen@example.com` (demo account remains local-only)

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file if you want local overrides, but the application runs without external environment variables. A sample file is provided in `.env.example`.

### Google OAuth Setup

Google sign-in is optional for local development and requires a real Google OAuth client ID. Set the following values in your `.env` file with your actual Google client ID:

```env
VITE_GOOGLE_CLIENT_ID=""
VITE_GOOGLE_REDIRECT_URI="http://localhost:5173/login"
```

Then configure the client in Google Cloud Console:

- Authorized JavaScript origins:
  - http://localhost:5173
- Add the `openid`, `email`, and `profile` scopes to the OAuth consent screen.

Google login cannot work without a real OAuth client ID. If no client ID is configured, use email/password login or add the client ID to `.env` and restart Vite. New email/password accounts are logged in immediately and do not require a verification code.

## Running the App

Create a local `.env` file from `.env.example` and set the admin password before running the app.

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

## Application Structure

```text
src/
  api/
  components/
  hooks/
  lib/
  pages/
  App.jsx
  main.jsx
  index.css
```

## Usage

1. Open the app in the browser.
2. Login with the demo admin or citizen account.
3. Report a complaint with a photo and location.
4. Track the complaint in the citizen dashboard.
5. Log in as admin to review, assign, and resolve issues.

## Configurable Complaint Timelines

Administrators can edit each stage's allowed duration and enable or disable stages in **Admin Dashboard → Timeline Management**. The dashboard also configures the higher-authority contact. A stage's deadline is calculated when a complaint enters that stage; subsequent settings changes apply when complaints next enter a stage. The complaint detail page shows stage start dates, allowed durations, deadlines, remaining time, completion state, and escalation details.

Overdue stages are marked separately from the complaint's operational status. The existing escalation history and notification flow records the escalation and alerts citizens and authorities. Disabled stages do not receive deadlines. Default values are starter settings only and can be changed by an administrator.

### Complaint completion and archive

`Resolved` is not a terminal completion state. An administrator must set the complaint to `Completed` after every workflow stage has a completed history entry and no pending action remains. The data layer rejects incomplete completion requests and moves valid records from the active complaints collection into a retained completed archive. Related comments/status updates, notifications, escalation history, and attachment references are preserved. Active dashboards and queues exclude archived complaints; citizens and administrators can still open completed records and see the completion confirmation.

This repository is currently a standalone local demo with no server-side API or database. Timeline settings and complaint records use the existing browser localStorage-backed data layer and survive refreshes in that browser; they are not shared across devices and are not protected by server-side authorization. The completion guard runs at this application data-layer boundary, but a production deployment still needs a real authenticated backend/database to enforce it against direct storage or API access.

### Workflow check

1. Sign in as the administrator and edit stage durations and the higher-authority contact in Timeline Management, then save.
2. Refresh the page and confirm the saved settings remain in place.
3. Submit a complaint and advance its status. Each entered stage should receive a start date and deadline based on the saved duration.
4. Open the complaint detail page as an administrator or citizen and verify the stage timeline, remaining days, status indicators, and escalation contact.
5. For an overdue test, adjust a disposable complaint's active `stage_history` deadline in localStorage to a past date and reload its list/detail view. Confirm it is marked overdue once, records escalation history, and creates notifications.

### Google login test

Google login requires a real OAuth client ID. Set `VITE_GOOGLE_CLIENT_ID` in `.env`, configure `http://localhost:5173` as an authorized JavaScript origin in Google Cloud Console, and enable the `openid`, `email`, and `profile` scopes. Restart Vite after changing `.env`, open `/login`, and use the Google sign-in button. Confirm successful sign-in redirects to the dashboard. Without a configured client ID, Google login reports a configuration error; email/password login remains available.

## Future Enhancements

- Real backend/API integration
- Database persistence with PostgreSQL or MongoDB
- Role-based JWT authentication
- Real file storage for uploaded images
- Map clustering and geospatial analytics
- Citizen notifications through email or SMS

## SDG 11 Alignment

This project supports SDG 11 by helping cities respond faster to public infrastructure problems, improve civic transparency, and create a data-driven approach to urban maintenance.

---

This app is intentionally designed to run locally in a VS Code workspace and does not depend on Base44 services.

## Ownership

Copyright (c) 2026 Manoj Kumar B M (`manojkumarbm-dev`). All rights reserved.

This project and its source code are reserved to the named owner. Do not redistribute, rebrand, or publish derivative copies without the owner's permission.

## 🏗️ System Architecture

```text
              ┌────────────────────┐
              │      Citizens      │
              │   Mobile App       │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │     Backend/API    │
              │ Complaint Handling │
              └─────────┬──────────┘
                        │
              ┌─────────┴──────────┐
              │                    │
              ▼                    ▼
      ┌───────────────┐    ┌────────────────┐
      │ Cloud Storage │    │    Database    │
      │ Images/Files  │    │ User/Complaint│
      └───────────────┘    └───────┬────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │ Admin Dashboard  │
                         │ Authorities      │
                         └──────────────────┘
```

---

## 🔐 Security

The platform can implement:

* User authentication
* Role-based access
* Secure password storage
* Authorized admin access
* Input validation
* Secure API communication
* Protection of user and complaint information

---

## 🌱 Sustainable Development Goal

### SDG 11 – Sustainable Cities and Communities

This project supports **United Nations Sustainable Development Goal 11**, which focuses on making cities and human settlements inclusive, safe, resilient, and sustainable.

The platform contributes by improving:

* Citizen participation
* Public service monitoring
* Urban problem reporting
* Government response
* Transparency
* Efficient use of resources

---

## 💡 Future Enhancements

The platform can be extended with:

* 🤖 AI-based complaint classification
* 📸 AI-based image-based issue detection
* 🧠 Automatic priority prediction
* 🗺️ Interactive complaint heatmaps
* 🔔 Push notifications
* 💬 Citizen-authority communication
* 📊 Advanced analytics dashboard
* 🌐 Multi-language support
* 🔗 Integration with government systems
* 📍 Geofencing and location-based alerts
* ⭐ Citizen feedback and rating system
* 📱 Progressive Web App support

---

## 👥 Target Users

* Citizens
* Municipal Authorities
* Government Departments
* Public Service Organizations
* Local Administration
* City Management Teams

---

## 🎯 Expected Impact

The Smart Public Complaint Tracking Platform aims to create a more connected and responsive public-service environment by providing a common digital platform for citizens and authorities.

It can help reduce manual processes, improve complaint visibility, support faster response, and provide authorities with useful information for managing public infrastructure.

---

## 📂 Project Structure

A possible project structure is:

```text
Smart-Public-Complaint-Tracking-Platform/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── ...
│
├── database/
│   └── ...
│
├── docs/
│   └── ...
│
├── README.md
└── .gitignore
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/manojkumarbm-dev/Smart-Public-Complaint-Tracking-Platform.git
```

### 2. Navigate to the Project

```bash
cd Smart-Public-Complaint-Tracking-Platform
```

### 3. Install Dependencies

Follow the installation instructions for the frontend and backend folders based on the technologies used in the project.

Example:

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file and add the required configuration such as:

```env
DATABASE_URL=
API_KEY=
PORT=
```

Do not upload passwords, API keys, database credentials, or other secrets to GitHub.

### 5. Run the Application

Start the backend and frontend according to your project configuration.

---

## 🤝 Contribution

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Commit your changes.
5. Push the branch.
6. Create a Pull Request.

---

## 📄 License

This project is developed as an academic/project work under **PRJ_364**.

---

## 👨‍💻 Project Information

**Project:** Smart Public Complaint Tracking Platform
**Project ID:** PRJ_364
**Domain:** Cloud Computing & Mobile Applications
**SDG:** SDG 11 – Sustainable Cities and Communities

---

⭐ **If you find this project useful, consider giving the repository a star!**
