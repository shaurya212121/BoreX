<div align="center">
  <img src="https://img.shields.io/badge/Status-Active_Development-00FF9D?style=for-the-badge&logoColor=black" alt="Status" />
  <img src="https://img.shields.io/badge/Hackathon-SIH_2026-C1622B?style=for-the-badge" alt="SIH" />
  <img src="https://img.shields.io/badge/Stack-React_19_%7C_Python_%7C_Supabase-3E2563?style=for-the-badge" alt="Tech Stack" />

  <br />
  <br />

  <h1 style="border-bottom: none;">🛢️ BoreX : Nearby Wells Intelligence System (NWIS)</h1>
  <p><em>See what's beneath — before you drill there.</em></p>

</div>

---

**BoreX** is a real-time geospatial command center designed for the **Smart India Hackathon 2026 (Problem Statement 143)**. 

Drilling blind is dangerous and expensive. BoreX correlates historical drilling data (Daily Drilling Reports) from offset wells with an active well's real-time depth trajectory. It surfaces critical subsurface risks—like **mud loss, stuck pipe, kicks, and overpressure**—*before* the drill bit encounters them.

Designed with a Palantir-inspired dark "Seismic Sonar" aesthetic, it acts as the ultimate tactical instrument for drilling engineers.

---

## ✨ Key Features & Architecture

BoreX has been completely overhauled to run as a unified, multi-module web application:

* **🎬 Cinematic 3D Entry:** An immersive React-Three-Fiber landing page featuring rotating geological strata layers and a descending drill bit illuminated by dynamic lighting.
* **🌐 Global Command Center Shell:** A unified, persistent dashboard layout allowing seamless navigation between tactical modules.
* **📍 Tactical Map & Scrubber:** A keyless, dark-themed OpenStreetMap interface plotting active and historical wells. Features a real-time depth scrubber to simulate drilling progress.
* **⚠️ Predictive Risk Correlator:** Python-based backend that matches real-time active depth to nearby historical events within a ±50m tolerance band using Haversine math.
* **📚 Drilling Knowledge Repository:** A fully searchable, filterable database of Historical Daily Drilling Reports (DDRs).
* **📄 One-Click Risk Dossiers:** Instantly generate and export beautifully formatted, print-ready PDF reports of predicted subsurface risks.
* **📊 Live Telemetry (Beta):** A dedicated interface prepared for real-time sensor integration (Rate of Penetration, Pump Pressure, etc.).

---

## 🛠️ The Tech Stack

### Frontend (Client-Side Intelligence)
* **Core:** React 19, Vite, TypeScript
* **Routing:** React Router DOM (Unified layout)
* **Styling:** Tailwind CSS v4 (Custom `@theme`), Framer Motion, Lucide Icons
* **Mapping:** React-Leaflet (Custom OSM inversion filters)
* **3D Rendering:** Three.js, React Three Fiber, Drei

### Backend (Data Engine & ML Pipeline)
* **Language:** Python 3.x
* **Database:** Supabase (PostgreSQL)
* **Key Libraries:** `supabase-py`, `haversine`, `python-dotenv`
* **Data Strategy:** Uses deterministic synthetic algorithms based on the Volve Field dataset to parse string reports, generate coordinates, and trigger accurate proximity alerts without relying on a slow, live LLM.

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Go to the **SQL Editor** and execute the contents of `backend/schema.sql` to create the 4 core tables with public Read-Only access.
3. Get your **Project URL**, **Anon Key**, and **Service Role Key**.

### 2. Backend Initialization (Python)
Navigate to the `backend` folder and populate your database:
```bash
cd backend
pip install -r requirements.txt
```
Create a `.env` file with your credentials (`SUPABASE_URL` and `SUPABASE_SERVICE_KEY`), then run:
```bash
python push_to_supabase.py
```
*This deterministically provisions Supabase with 9 wells, 64 historical reports, 74 depth progress timestamps, and 48 targeted risk alerts.*

### 3. Frontend Development (React)
Navigate to the `frontend` folder and launch the command center:
```bash
cd frontend
npm install
```
Create a `.env` file for the client (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`), then run:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser and click **INITIALIZE SYSTEM**.

---

## 📂 Project Structure

```text
BoreX/
├── backend/
│   ├── schema.sql              # Supabase table definitions
│   ├── push_to_supabase.py     # Master data orchestration script
│   ├── nearby_wells.py         # Haversine radius math
│   ├── report_parser.py        # Keyword/regex extraction for DDRs
│   ├── risk_correlator.py      # Depth-proximity risk scoring
│   └── progress_simulator.py   # ROP timeline simulation
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── DashboardLayout.tsx # Global command center shell
    │   ├── pages/
    │   │   ├── LandingPage.tsx     # Cinematic 3D entry
    │   │   ├── TacticalMap.tsx     # Live map & timeline scrubber
    │   │   ├── KnowledgeRepo.tsx   # Searchable drilling reports
    │   │   ├── Telemetry.tsx       # Live sensor placeholders
    │   │   └── Reports.tsx         # PDF Dossier generator
    │   ├── index.css               # Tailwind v4 seismic theme config
    │   └── lib/supabase.ts         # Supabase client & TS interfaces
    └── public/
        └── bg_seismic.jpg          # AI-generated sonar topography
```

---
<div align="center">
  <p><i>Developed for SIH 2026 • Oil India Limited</i></p>
</div>
