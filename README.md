# BoreX: Nearby Wells Intelligence System (NWIS) 🛢️

![BoreX Command Center](https://img.shields.io/badge/Status-Active_Development-success)
![SIH 2026](https://img.shields.io/badge/Hackathon-SIH_2026-orange)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_%7C_Python_%7C_Supabase-blue)

**BoreX** is a real-time geospatial command center built for **Smart India Hackathon 2026**. It correlates historical drilling data from offset wells with an active well's real-time depth, surfacing critical risks (mud loss, stuck pipe, kicks, overpressure) *before* the drill bit encounters them.

Designed with a Palantir-inspired "Subsurface Instrument" aesthetic, it helps drilling engineers visualize what lies beneath the surface.

---

## ✨ Key Features

* **🌍 Live Operational Dashboard**: Interactive Leaflet map plotting active and historical wells, featuring a real-time depth scrubber to simulate drilling progress.
* **⚠️ Predictive Risk Correlator**: Python-based backend that matches real-time active depth to nearby historical events within a ±50m tolerance band. 
* **📚 Drilling Knowledge Repository**: A searchable, filterable database of Daily Drilling Reports (DDRs).
* **🧊 3D Geological Landing Page**: An immersive Three.js scene showing geological strata layers and an animated drill bit.
* **⚡ Deterministic Data Engine**: Uses `uuid5` and Haversine geospatial math to deterministically push Volve-field-inspired synthetic data to Supabase.

---

## 🛠️ Tech Stack

### Frontend
* **Core:** React 19, Vite, TypeScript
* **Styling:** Tailwind CSS v4, Framer Motion
* **Mapping:** Leaflet, React-Leaflet
* **3D rendering:** Three.js, React Three Fiber, Drei

### Backend & Database
* **Language:** Python 3.x
* **Database:** Supabase (PostgreSQL)
* **Key Libraries:** `supabase-py`, `haversine`, `python-dotenv`

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Go to the **SQL Editor** and execute the contents of `backend/schema.sql` to create the 4 core tables with public Read-Only access.
3. Get your **Project URL**, **Anon Key**, and **Service Role Key**.

### 2. Backend Initialization (Python)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file with your credentials:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   ```
3. Install dependencies and run the data engine:
   ```bash
   pip install -r requirements.txt
   python push_to_supabase.py
   ```
   *This will deterministically populate your Supabase instance with wells, historical drilling reports, depth progress, and risk alerts.*

### 3. Frontend Development (React)
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Create a `.env` file for the client:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
3. Install packages and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser!

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
│   └── progress_simulator.py   # ROP and NPT timeline simulation
└── frontend/
    ├── src/pages/
    │   ├── LandingPage.tsx     # 3D geological scene
    │   ├── Dashboard.tsx       # Live map & timeline scrubber
    │   └── KnowledgeRepo.tsx   # Searchable drilling reports
    ├── src/index.css           # Tailwind v4 theme configuration
    └── src/lib/supabase.ts     # Supabase client & TS interfaces
```
