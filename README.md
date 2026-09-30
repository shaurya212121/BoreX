<div align="center">

  <img src="https://img.shields.io/badge/Smart_India_Hackathon-2026-C1622B?style=for-the-badge" alt="SIH 2026" />
  <img src="https://img.shields.io/badge/Problem_Statement-121-3E2563?style=for-the-badge" alt="PS 121" />
  <img src="https://img.shields.io/badge/Organisation-Oil_India_Limited-0B7A75?style=for-the-badge" alt="Oil India Limited" />
  <img src="https://img.shields.io/badge/Status-Active_Development-00FF9D?style=for-the-badge&logoColor=black" alt="Status" />

  <br />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Data-Synthetic_Benchmark-orange?style=flat-square" alt="Synthetic data" />

  <br /><br />

  <h1 style="border-bottom: none;">🛢️ Well-Whisperer</h1>
  <h3>Nearby Wells Intelligence System (NWIS) for eRTMAC-ready drilling operations</h3>
  <p><em>Every offset well has already told a story. Well-Whisperer listens, so you hear it before the bit does.</em></p>

</div>

---

> **Formerly known as BoreX.** The project was renamed to **Well-Whisperer** for SIH 2026 submission under **Problem Statement 121**.

---

## 📑 Table of Contents

1. [The Problem](#-the-problem)
2. [Our Solution](#-our-solution)
3. [Headline Innovations](#-headline-innovations)
4. [Platform Modules](#-platform-modules)
5. [System Architecture](#-system-architecture)
6. [Tech Stack](#-tech-stack)
7. [Intelligence Engines (How It Works)](#-intelligence-engines-how-it-works)
8. [Data Model & Benchmark Dataset](#-data-model--benchmark-dataset)
9. [REST API Reference](#-rest-api-reference)
10. [Getting Started](#-getting-started)
11. [Configuration](#-configuration)
12. [Testing & Measured Benchmark](#-testing--measured-benchmark)
13. [Project Structure](#-project-structure)
14. [Data Provenance & Honest Limitations](#-data-provenance--honest-limitations)
15. [Roadmap](#-roadmap)
16. [Team & Credits](#-team--credits)

---

## 🎯 The Problem

Drilling a well is one of the most expensive and risk-heavy operations in the energy industry. Every field has a memory of what went wrong before: **mud losses, stuck pipe, gas kicks, overpressured zones, cementing failures**. But that memory is locked away in thousands of unstructured Daily Drilling Reports (DDRs), many of them scanned PDFs or typed logs, scattered across wells.

When a rig crew drills a new well, they usually cannot answer the questions that matter most:

- *Which nearby wells hit trouble at the depth we are about to reach?*
- *How much mud-weight margin do we actually have right now?*
- *What did the last crew do about it, and did it work?*
- *Can we plan the next well's casing and mud program using what the neighbours already taught us?*

Drilling blind is dangerous and expensive. A single kick or stuck-pipe event can cost days of non-productive time (NPT) or endanger the crew.

## 💡 Our Solution

**Well-Whisperer** is a real-time geospatial command centre that **correlates an active well's live depth and telemetry with the history of every nearby well**, and surfaces subsurface risk **before** the drill bit reaches it.

It does four things:

1. **Reads** unstructured DDRs (digital and scanned PDFs) and turns them into structured, searchable drilling events using an NLP / NER pipeline.
2. **Correlates** those historical events against the active well by geography (Haversine distance), depth (±50 m band), geology (lithofacies similarity) and live sensor behaviour.
3. **Predicts** probable hazards with explainable probabilities and confidence scores, and shows the safe operating envelope (pore pressure vs. fracture gradient) around the live mud weight.
4. **Acts**: auto-drafts DDR entries when an anomaly appears, generates print-ready risk dossiers, and lets engineers click anywhere on the map to get a pre-spud risk brief for a well that does not exist yet.

It is built on an **adapter architecture**, so the synthetic telemetry engine used in the demo can be swapped for the real **OIL eRTMAC / WITSML** stream without touching the intelligence layer.

---

## 🚀 Headline Innovations

| # | Innovation | What it does | Status in this repo |
|---|-----------|--------------|--------------------|
| 1 | **Safe Mud-Weight Window** | Real-time operating envelope bar showing formation pore pressure (collapse side) and fracture gradient (loss side) against the live mud weight. Sits on the Live Telemetry page. | ✅ Implemented (`Telemetry.tsx`, `telemetry_provider.py`) |
| 2 | **Auto-Drafted DDR Entries** | When the telemetry stream flags an active anomaly (mud loss, stuck pipe, pack-off, gas kick), the system drafts a structured DDR entry pre-filled with depth, formation, and sensor snapshot, queued for engineer review. Sits on the Risk Reports page. | ✅ Implemented (`Reports.tsx`, `dataService.getAutoDrafts`) |
| 3 | **Click-to-Plan Virtual Well (Pre-Spud Mode)** | Click any point on the Tactical Map to place a proposed well. The system correlates it against surrounding offset wells and exports a **Pre-Spud Risk Dossier PDF**. | ✅ Implemented (`TacticalMap.tsx`, `dossierPdfGenerator.ts`) |
| 4 | **Eight-module intelligence backend** | NLP/NER, event classification, risk prediction, geological correlation, telemetry provider adapter, PDF ingestion, PDF report generation, and a measured benchmark evaluator, all behind a FastAPI service. | ✅ Implemented (`backend/`) |
| 5 | **eRTMAC-ready adapter** | Pluggable `ITelemetryProvider` interface with a working synthetic provider and a WITSML/eRTMAC adapter stub. | ✅ Interface implemented, real network intentionally disconnected |
| 6 | **Honest, measured accuracy badge** | The accuracy shown in the UI is computed by `benchmark_evaluator.py` on a labelled test set. Nothing is hard-coded. | ✅ Implemented |

More ideas we designed but have not built yet are listed in the [Roadmap](#-roadmap).

---

## 🧩 Platform Modules

The app is a single-page React application with a cinematic landing page and a persistent dashboard shell.

| Route | Module | What you get |
|-------|--------|--------------|
| `/` | **Landing Page** | Cinematic 3D entry built with React Three Fiber: rotating geological strata, a descending drill bit, dynamic lighting, GSAP/Lenis smooth scrolling, and feature cards. Click **INITIALIZE SYSTEM** to enter the command centre. |
| `/app/map` | **Tactical Map** | Leaflet map of the active well and all offset wells, with four basemaps (Dark, Voyager, Light, Esri Satellite). **Depth scrubber** to simulate drilling progress; correlated hazard catalog updates as depth changes; Haversine proximity rings; **Pre-Spud Mode** (Innovation 3). |
| `/app/telemetry` | **Live Telemetry** | Streaming sensors (ROP, WOB, RPM, torque, standpipe pressure, flow, mud weight, ECD, gas, pit volume, hookload), trend area/line charts, **rheology tab** (PV, YP, mud density, mud system type), predicted hazard likelihood, and the **Safe Mud-Weight Window** (Innovation 1). |
| `/app/knowledge` | **Knowledge Base** | Searchable, category-filterable archive of historical DDRs with an operational summary ("What happened"), risk consequence ("Why it matters"), executed mitigation, and extracted **NER entities**. Toggle raw text vs. structured view. |
| `/app/reports` | **Risk Reports** | Multi-well risk dossier: overall risk state, highest risk probability, lookahead events, critical hazards, lithology and pore-pressure regime per formation, engineered mitigation protocols, and the **Auto-Drafted DDR review queue** (Innovation 2). One-click PDF export. |
| `/app/trajectory` | **Trajectory Analysis** | Compare the active well's directional profile against any offset well: TVD comparison, inclination, tangent angle, **dogleg severity**, profile-geometry match, and an interactive canvas 3D wellbore view (click and drag to rotate) with minimum-separation readout. |

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND  (React 19 + Vite)                      │
│  Landing · Tactical Map · Live Telemetry · Knowledge Base · Reports · Traj │
│                                                                            │
│                     lib/dataService.ts  (data access layer)               │
│      1) Supabase  →  2) FastAPI backend (2 s timeout)  →  3) bundled       │
│         (if seeded)        (live intelligence)             benchmark data   │
└───────────────┬───────────────────────────────┬────────────────────────────┘
                │ supabase-js (read-only, RLS)  │ REST / JSON
                ▼                               ▼
     ┌─────────────────────┐        ┌────────────────────────────────────────┐
     │  Supabase Postgres  │        │        BACKEND  (FastAPI, Python)      │
     │  wells              │        │                                        │
     │  drilling_reports   │◄───────│  push_to_supabase.py  (seed + sync)    │
     │  active_well_progress│       │                                        │
     │  risk_alerts        │        │  services/                             │
     └─────────────────────┘        │   ├─ telemetry_provider   (adapter)    │
                                    │   ├─ document_ingestion   (PDF / OCR)  │
                                    │   ├─ nlp_ner_pipeline     (NER + event)│
                                    │   ├─ ml_risk_predictor    (probabilistic)
                                    │   ├─ geological_correlator(similarity) │
                                    │   ├─ nearby_wells / risk_correlator    │
                                    │   └─ pdf_generator        (ReportLab)  │
                                    │  evaluation/benchmark_evaluator        │
                                    └───────────────┬────────────────────────┘
                                                    │  ITelemetryProvider
                                   ┌────────────────┴────────────────┐
                                   ▼                                 ▼
                       SyntheticTelemetryProvider        FutureERTMACProvider
                       (active in demo)                  (WITSML/eRTMAC adapter,
                                                          disconnected by design)
```

**Resilience by design:** the frontend never shows a blank screen. If Supabase is unseeded or the backend is offline, `dataService.ts` transparently falls back to a deterministic bundled benchmark dataset, so the demo works even on a laptop with no network.

---

## 🛠️ Tech Stack

### Frontend

| Area | Technology |
|------|-----------|
| Core | React 19, TypeScript, Vite |
| Routing | React Router 7 (unified dashboard layout, animated transitions) |
| Styling | Tailwind CSS v4 (custom `@theme`), Framer Motion, GSAP, Lenis |
| Mapping | Leaflet, React-Leaflet (CARTO dark / voyager / light + Esri satellite basemaps) |
| 3D | Three.js, React Three Fiber, Drei |
| Charts | Recharts (area and line charts) |
| PDF | jsPDF (client-side dossiers), with server-side ReportLab PDF as the primary path |
| Icons | Lucide React |
| Tooling | Vite, oxlint, `tsc -b` |

### Backend

| Area | Technology |
|------|-----------|
| API | FastAPI, Uvicorn, Pydantic, python-multipart |
| Scientific | NumPy, SciPy, Pandas |
| Geospatial | `haversine` plus an in-house great-circle implementation |
| Documents | pypdf, Pillow, pytesseract (listed dependency) |
| Reports | ReportLab |
| Database | Supabase (PostgreSQL) via `supabase-py`, `python-dotenv` |

### Database

- **Supabase / PostgreSQL** with Row-Level Security enabled and **public read-only** policies.
- Indexed on `well_id`, `depth_m`, `event_type`, `severity`.

---

## 🧠 Intelligence Engines (How It Works)

### 1. Nearby-Well Discovery: `nearby_wells.py`
Finds every offset well within a configurable radius (default **50 km**) of the active well using the **Haversine great-circle formula**. Deterministic and explainable: an engineer can verify any distance with a calculator.

### 2. Depth-Proximity Risk Correlator: `risk_correlator.py`
Matches the active well's current depth against every non-normal historical event in the nearby wells, inside a **±50 m depth band**.

```text
composite_score = severity_score × depth_closeness × proximity_weight

severity_score     : critical = 10, high = 7, medium = 4, low = 1
depth_closeness    : 1.0 at exact depth, linearly falling to 0 at ±50 m
proximity_weight   : 1.0 within 1 km, otherwise max(0.1, e^(−distance_km / 20))
```

Each alert carries a human-readable message and a `why_flagged` field quoting the historical DDR note, so every warning is traceable to a real (benchmark) event.

### 3. Telemetry Provider Architecture: `telemetry_provider.py`
An abstract `ITelemetryProvider` defines four calls (`get_current_telemetry`, `get_stream_chunk`, `is_connected`, provider name/type). Two implementations ship:

- **`SyntheticTelemetryProvider`**: physically coherent Upper Assam simulation. Parameters shift with formation, and deterministic hazard zones inject correlated anomalies (see table below).
- **`FutureERTMACProvider`**: the production interface stub for WITSML / eRTMAC. It reports `is_connected() = False` and returns an explicit "awaiting credentials" status. Swapping providers requires no changes to the intelligence layer.

**Formations modelled (Upper Assam Basin):**

| Depth (m MD) | Formation | Typical hazard |
|--------------|-----------|----------------|
| 0 – 650 | Dhekiajuli Fm. | Seepage losses, washout |
| 650 – 1,550 | Girujan Clay Fm. | Clay swelling, bit balling, shallow gas |
| 1,550 – 2,300 | Upper Tipam Sandstone Fm. | Massive circulation loss (thief zone) |
| 2,300 – 2,850 | Lower Tipam Sandstone Fm. | Differential sticking (depleted sands) |
| 2,850 – 3,350 | Barail Coal-Shale Fm. | Gas kicks, pack-off, overpressure |
| 3,350 – 3,700 | Barail Main Sandstone Fm. | Overpressure ramp |
| 3,700+ | Kopili Shale Fm. | Deep high-pressure shale |

**Injected hazard zones (linked to offset-well incidents):**

| Interval (m MD) | Hazard code | Signature |
|-----------------|-------------|-----------|
| 1,780 – 1,860 | `MUD_LOSS` | Flow ↓, SPP ↓, pit volume ↓ |
| 2,440 – 2,520 | `STUCK_PIPE` | Torque ↑, ROP ↓ |
| 2,700 – 2,780 | `PACK_OFF` | Torque ↑↑, ROP ↓ |
| 3,080 – 3,160 | `GAS_KICK` | Gas units ↑↑, pit volume ↑, SPP ↑ |

### 4. NLP / NER Pipeline: `nlp_ner_pipeline.py`
Turns free-text DDR narrative into structured intelligence.

- **Entity types (18):** WELL, DEPTH, FORMATION, EVENT, SEVERITY, MUD_PROPERTY, PRESSURE, ROP, TORQUE, RPM, WOB, LOSS, GAIN, CASING, CEMENT, TRAJECTORY, MITIGATION, EQUIPMENT.
- **Event classes (14):** Lost Circulation, Kick, Gas Influx, Stuck Pipe, Differential Sticking, Pack-off, Tight Hole, Washout, Bit Balling, Wellbore Instability, Casing Issue, Cementing Issue, Formation Pressure Issue, Normal Drilling.
- **Method:** a domain lexicon (Assam formation names, event phrases with severity and confidence weights) combined with regex extraction for numeric entities (depths, pressures, volumes). Each extraction returns a confidence, and mitigation actions are pulled out of the narrative.
- **Output:** entities with confidence, primary event with severity, a parameter table, and mitigations, all tagged with source document and page.

### 5. Document Ingestion: `document_ingestion.py`
Pipeline: **validate → extract text → (scanned page?) OCR path → structured reconstruction with provenance.**

- Uses `pypdf` to extract digital text; pages with sufficient text are marked `DIGITAL_TEXT_EXTRACTION` (confidence 0.98).
- Pages with little or no text are routed to the scanned-page path and marked `SCANNED_PAGE_OCR`.
- Each page keeps **source filename, page number, extraction method, confidence, word count**, and a table-structure heuristic (pipes, tabs, dense numeric rows).
- See [Honest Limitations](#-data-provenance--honest-limitations) for the current state of the OCR path.

### 6. Probabilistic Risk Predictor: `ml_risk_predictor.py`
A multi-feature, explainable risk engine (`v1.2-synthetic-benchmark`) that evaluates five hazard families and returns a sorted list with **probability, confidence, class (CRITICAL / HIGH / MEDIUM / LOW) and contributing factors**:

1. Differential sticking (Lower Tipam depleted sands)
2. Overpressured gas kick (Barail Coal-Shale / Main Sand)
3. Severe lost circulation (Upper Tipam / Dhekiajuli)
4. Wellbore instability / pack-off (Barail transition)
5. Overpressure ramp (formation transitions)

Inputs: depth offset to historical hazard horizons, spatial distance decay, formation hazard index, live sensor deltas (torque, ROP, SPP, ECD, gas, pit volume), mud weight vs. pore pressure, and casing-shoe proximity. Every prediction lists the evidence that produced it. The model is clearly labelled **"Synthetic benchmark model (Not production validated)"** in the API response.

### 7. Geological Correlator: `geological_correlator.py`
Scores how geologically similar an offset interval is to the active horizon.

```text
similarity = 0.40 × lithofacies_similarity      (cosine on sand/shale/coal/porosity/perm/overpressure vectors)
           + 0.35 × depth_proximity             (Gaussian, σ = 140 m)
           + 0.15 × distance_factor             (exp(−(d / 75 km)^1.2))
           ± formation bonus                    (+0.20 same formation, −0.15 different)
clamped to 12% – 98%
```

Returns similarity %, confidence, contributing factors, target lithology, and expected hazard.

### 8. PDF Report Generation: `pdf_generator.py` / `dossierPdfGenerator.ts`
`POST /api/reports/generate-pdf` builds a real, print-ready **Operational Risk Dossier** with ReportLab. The frontend also has a jsPDF path used for the Pre-Spud dossier.

### 9. Measured Benchmark Evaluator: `evaluation/benchmark_evaluator.py`
Runs the NER/classification test set and risk-prediction test set and reports **precision, recall, F1 and accuracy**. The UI badge reads this output, so the number shown is the number measured. See [Testing & Measured Benchmark](#-testing--measured-benchmark).

---

## 🗄️ Data Model & Benchmark Dataset

### Supabase schema (`backend/data/schema.sql`)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `wells` | Active and offset wells | `id`, `name`, `lat`, `lon`, `field_name`, `basin`, `spud_date`, `total_depth_m`, `status` |
| `drilling_reports` | Historical DDR events | `well_id`, `report_date`, `depth_m`, `formation`, `event_type`, `severity`, `notes`, `source_document` |
| `active_well_progress` | Depth-vs-time for the scrubber | `well_id`, `current_depth_m`, `rop_m_hr`, `timestamp` |
| `risk_alerts` | Correlated alerts | `active_well_id`, `nearby_well_id`, `matched_depth_m`, `event_type`, `distance_km`, `severity`, `composite_score`, `message` |

Row-Level Security is on for all four tables with **public read** policies (the frontend uses the anon key, so it can never write).

### Synthetic Upper Assam benchmark (generated by `push_to_supabase.py`)

Deterministic (seeded) generation centred near the Dibrugarh / Duliajan sector (~27.32°N, 95.32°E):

| Item | Count |
|------|-------|
| Wells | **18** (1 active `IND-NWIS-01` + 17 offset wells) |
| Daily drilling report events | **261** across 7 formations (kick 49, cementing 41, mud loss 31, drilling problem 26, stuck pipe 21, overpressure 8, normal 85) |
| Active-well depth progression points | **117** (0 to 3,650 m, with realistic ROP and NPT flat spots) |
| Correlated risk alerts | **151** |
| Additional engineering records | Mud properties, casing programs, cement programs, directional surveys per well (`models/data_models.py`) |

> Counts are produced by the generator and can change if the generator is modified. Run `python push_to_supabase.py` to see the current numbers.

---

## 🔌 REST API Reference

Base URL: `http://127.0.0.1:8000` · Interactive docs at **`/docs`** (Swagger UI) and **`/redoc`**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System status, region, active provider, eRTMAC adapter status, data provenance banner |
| GET | `/api/telemetry/provider` | Active and available telemetry providers with disclosures |
| GET | `/api/telemetry/live?depth=` | Instantaneous telemetry snapshot at a depth (includes `safe_mw_window`, `hazard_code`, `active_warning`) |
| GET | `/api/telemetry/stream?start=&end=&step=` | Contiguous telemetry stream between two depths |
| POST | `/api/ingest/document` | Upload a DDR (PDF or image): extract text, then run NER and event classification |
| POST | `/api/nlp/parse` | Run NER and event classification on raw text |
| GET | `/api/ml/risk?depth=` | Probabilistic hazard predictions with explainable evidence |
| GET | `/api/geology/correlate` | Geological similarity between active and offset horizons |
| GET | `/api/trajectory?well_id=` | 3D / 2D directional survey points |
| GET | `/api/mud-properties?well_id=` | Mud property records |
| GET | `/api/casing-cement?well_id=` | Casing and cement programs |
| GET | `/api/wells` · `/api/reports` | Well list · historical DDR events |
| GET | `/api/progress?active_well_id=` | Depth progression for the timeline scrubber |
| GET | `/api/alerts?active_well_id=` | Correlated risk alerts for the active well |
| GET | `/api/analytics/trends` | Multi-well trend comparison (ROP, torque, SPP, MW, ECD) |
| POST | `/api/reports/generate-pdf` | Returns a compiled Risk Dossier PDF |
| GET | `/api/benchmark/evaluation` | Measured benchmark metrics |

---

## ⚡ Getting Started

### Prerequisites
- **Python 3.10+** (developed on 3.12)
- **Node.js 20.19+** (developed on 22) and npm
- *(Optional)* a free [Supabase](https://supabase.com/) project. The app runs without it using bundled benchmark data.

### 1. Clone
```bash
git clone <your-repo-url> Well-Whisperer
cd Well-Whisperer
```

### 2. Database (optional but recommended)
1. Create a project on Supabase.
2. Open **SQL Editor** and run the contents of `backend/data/schema.sql`.
3. Collect your **Project URL**, **anon key** and **service-role key**.

### 3. Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```
Create `backend/.env` (only needed to push data to Supabase):
```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```
Seed Supabase (also writes a standalone `data/seed_indian_basin.sql`):
```bash
python push_to_supabase.py
```
Start the API:
```bash
python run.py
# → http://127.0.0.1:8000  (Swagger UI at /docs)
```

### 4. Frontend
```bash
cd frontend
npm install
```
Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_MAP_API_KEY=<optional-carto-basemap-key>
```
Run:
```bash
npm run dev
# → http://localhost:5173
```
Click **INITIALIZE SYSTEM** to enter the command centre.

### Run modes at a glance

| You start... | What works |
|--------------|-----------|
| Frontend only | Everything, from the bundled benchmark dataset (offline-safe demo mode) |
| Frontend + backend | Adds live telemetry stream, ML risk, geology correlation, server PDF, benchmark badge |
| Frontend + backend + Supabase | Wells, reports, progress and alerts are read from the database |

---

## ⚙️ Configuration

| Variable | Where | Purpose |
|----------|-------|---------|
| `SUPABASE_URL` | `backend/.env` | Supabase project URL for seeding |
| `SUPABASE_SERVICE_KEY` | `backend/.env` | Service-role key used **only** by `push_to_supabase.py`. Never expose it to the frontend. |
| `VITE_SUPABASE_URL` | `frontend/.env` | Supabase URL for the browser client |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Anon key (read-only via RLS) |
| `VITE_MAP_API_KEY` | `frontend/.env` | Optional CARTO basemap key |

The frontend expects the backend at `http://127.0.0.1:8000` (constant `BACKEND_BASE` in `frontend/src/lib/dataService.ts`).

**Useful commands**

```bash
# Frontend
npm run dev        # dev server
npm run build      # type-check + production build
npm run lint       # oxlint
npm run preview    # preview production build

# Backend
python run.py                      # API with auto-reload
python push_to_supabase.py         # generate + push benchmark data
python tests/test_pipeline.py      # backend intelligence test suite
```

---

## ✅ Testing & Measured Benchmark

Run the backend suite:

```bash
cd backend
python tests/test_pipeline.py
```

It verifies telemetry providers, the eRTMAC adapter interface, NER extraction, PDF ingestion, geological correlation, ML risk prediction, ReportLab PDF generation, and the benchmark evaluator. All checks pass in the current repository.

**Measured benchmark (synthetic Upper Assam test split, 34 labelled samples):**

| Metric | Result |
|--------|--------|
| NER precision | 0.810 |
| NER recall | 0.942 |
| NER F1 | 0.871 |
| Event classification accuracy | 0.708 |
| Risk prediction accuracy | 1.000 |
| **Composite score shown in UI** | **86.1 %** (0.40 × NER F1 + 0.30 × event accuracy + 0.30 × risk accuracy) |

We deliberately show the measured number instead of a target number. The test set is small and synthetic, so these figures demonstrate that the evaluation harness is real, **not** that the system is validated on operational data. Validation on real OIL DDRs is the first item on the roadmap.

---

## 📂 Project Structure

```text
Well-Whisperer/
├── README.md
├── .gitignore
│
├── backend/
│   ├── run.py                        # Uvicorn launcher (port 8000)
│   ├── server.py                     # FastAPI app and all REST routes
│   ├── push_to_supabase.py           # Deterministic dataset generator + Supabase sync
│   ├── progress_simulator.py         # Depth-vs-time simulation with NPT flat spots
│   ├── requirements.txt
│   ├── data/
│   │   └── schema.sql                # Supabase tables, RLS policies, indices
│   ├── models/
│   │   └── data_models.py            # Mud / casing / cement / trajectory generators
│   ├── services/
│   │   ├── telemetry_provider.py     # ITelemetryProvider + Synthetic + eRTMAC adapter
│   │   ├── document_ingestion.py     # PDF text extraction and scanned-page path
│   │   ├── nlp_ner_pipeline.py       # Entity extraction and event classification
│   │   ├── report_parser.py          # Lightweight DDR keyword / regex parser
│   │   ├── ml_risk_predictor.py      # Probabilistic multi-hazard predictor
│   │   ├── geological_correlator.py  # Lithofacies similarity engine
│   │   ├── nearby_wells.py           # Haversine radius search
│   │   ├── risk_correlator.py        # ±50 m depth-band alert scoring
│   │   └── pdf_generator.py          # ReportLab dossier builder
│   ├── evaluation/
│   │   └── benchmark_evaluator.py    # Measured precision / recall / F1
│   └── tests/
│       └── test_pipeline.py          # Backend intelligence test suite
│
└── frontend/
    ├── index.html
    ├── vite.config.ts · tailwind.config.js · postcss.config.js · tsconfig*.json
    ├── package.json
    ├── public/                       # favicon, icons, seismic background
    └── src/
        ├── main.tsx · App.tsx        # Router with animated transitions
        ├── index.css                 # Tailwind v4 "Seismic Sonar" theme
        ├── components/
        │   ├── DashboardLayout.tsx   # Persistent command-centre shell + navigation
        │   └── PageTransition.tsx
        ├── hooks/
        │   └── useAnimations.ts
        ├── lib/
        │   ├── dataService.ts        # Supabase → backend → bundled-data fallback
        │   ├── supabase.ts           # Client and shared TypeScript types
        │   ├── assamBenchmarkData.ts # Bundled offline benchmark dataset
        │   └── dossierPdfGenerator.ts# jsPDF pre-spud / risk dossier
        └── pages/
            ├── LandingPage.tsx       # Cinematic 3D entry
            ├── TacticalMap.tsx       # Map, depth scrubber, Pre-Spud mode
            ├── Telemetry.tsx         # Sensors, trends, rheology, Safe MW Window
            ├── KnowledgeRepo.tsx     # DDR search and NER view
            ├── Reports.tsx           # Risk dossier and DDR auto-draft queue
            └── TrajectoryComparison.tsx # Directional profile and 3D view
```

---

## 🔍 Data Provenance & Honest Limitations

We would rather you hear these from us than discover them.

- **All data is synthetic.** Every well, report, alert and telemetry value comes from a deterministic generator calibrated to the general geology of the Upper Assam Basin and inspired by the structure of public datasets such as Volve. **No proprietary Oil India data was used.** The UI and API repeat this disclosure: *"SYNTHETIC DEMONSTRATION BENCHMARK · NOT OPERATIONAL OIL DATA."*
- **The eRTMAC connection is an interface, not a live link.** `FutureERTMACProvider` documents the integration contract and reports itself as disconnected.
- **NLP/NER is lexicon- and regex-driven**, not a trained transformer. It is fast, deterministic and auditable, but will need a trained model (or spaCy / domain-tuned LLM) for the messy language of real archives.
- **The risk predictor is a hand-calibrated, explainable scoring model**, not a model trained on field outcomes. Its 100 % accuracy on our test set reflects that the test cases were built from the same hazard logic. Treat it as a demonstration of the evaluation pipeline, not as proof of predictive skill.
- **Scanned-page OCR is a simulated recovery path.** Digital PDFs are genuinely parsed with `pypdf`. For pages without a text layer, the pipeline currently returns representative reconstructed DDR text so the downstream NLP flow can be demonstrated. Real Tesseract-based OCR (`pytesseract` is already a dependency) is on the roadmap. Image uploads to `/api/ingest/document` use the same placeholder.
- **The Safe Mud-Weight Window is a visualisation of the operating envelope around the simulated mud program.** Pore-pressure and fracture-gradient values are currently generated as a band around the live mud weight; they are not yet derived from measured leak-off tests or per-formation pressure logs.
- **The Knowledge Base UI displays a curated set of sample DDRs.** The upload-and-analyse flow is exposed by the backend (`/api/ingest/document`) but is not yet wired into the Knowledge Base page.
- **The Live Telemetry view is a simulation** driven by the synthetic provider.

---

## 🗺️ Roadmap

**Near term (design done, build next)**

| Idea | Why it matters |
|------|----------------|
| **Time-to-Hazard Countdown** | Convert "hazard at 2,480 m" into "hazard in ~3.4 h at current ROP", so every alert becomes actionable. |
| **Depth-driven Safe Mud-Weight Window** | Derive PP and FG from per-formation pressure data and leak-off tests in offset casing/cementing records instead of the current band model. |
| **Real OCR for scanned DDRs** | Wire Tesseract (with image pre-processing) into the ingestion pipeline and hook the upload flow into the Knowledge Base. |
| **Trained NER model** | Replace lexicon/regex extraction with a spaCy or transformer model fine-tuned on annotated DDRs. |

**Longer term (concept stage)**

| Idea | Description |
|------|-------------|
| **Mitigation Outcome Ledger** | Track which mitigation (LCM pill, spotting fluid, weight-up) was applied for each past event and how many NPT hours it cost, so the system can recommend what *actually worked*. |
| **Analog-Well Mode** | Match the active well to the most geologically and operationally similar historical wells and replay their drilling story. |
| **Tacit-Knowledge Capture** | Let veteran drillers annotate wells and events with lessons that never made it into a DDR. |
| **Hazard Signature Matching** | Match live sensor signatures (torque/ROP/SPP patterns) to pre-incident signatures from history. |
| **Alert Feedback Loop** | Let engineers confirm or dismiss alerts and feed that back into scoring. |
| **Production eRTMAC integration** | Implement the WITSML client behind `FutureERTMACProvider` and validate on real OIL data under appropriate agreements. |
| **Authentication and audit trail** | Role-based access and immutable logs for reviewed auto-drafted DDR entries. |

---

## 👥 Team & Credits

- **Team name:** _[add team name]_
- **Members:** _[add member names]_
- **Mentor:** _[add mentor name]_
- **Institution:** _[add institution]_

Built for **Smart India Hackathon 2026**, **Problem Statement 121**, in collaboration with the domain context of **Oil India Limited**.

Open-source libraries: React, Vite, Tailwind CSS, Leaflet, Three.js, Recharts, jsPDF, FastAPI, Pydantic, NumPy, SciPy, Pandas, ReportLab, pypdf, Supabase. Basemaps © CARTO, © OpenStreetMap contributors, © Esri.

---

<div align="center">
  <p><i>Well-Whisperer · Developed for SIH 2026 · Problem Statement 121 · Oil India Limited</i></p>
  <p><sub>All operational data shown is a synthetic demonstration benchmark.</sub></p>
</div>
