# SCD App

SCD App is a small SCADA-style dashboard for collecting measurements from Siemens S7 PLCs, storing hourly snapshots in PostgreSQL, and viewing or exporting those measurements from a browser.

The repository contains two applications:

- `backend/`: an Express API and PLC polling process.
- `frontend/`: a React single-page dashboard built with Vite.

## How the application works

```text
PostgreSQL configuration (plc + plc_tag)
                 |
                 v
Backend loads active PLCs/tags and creates one timer per tag
                 |
                 v
nodes7 reads each configured S7 address at its poll interval
                 |
                 v
Latest valid value is cached in backend memory
                 |
                 v
At the start of every hour, one snapshot per active tag is saved
to PostgreSQL (measurement)
                 |
                 v
Express /api/measurements endpoints
                 |
                 v
React Reporting page -> table and Excel export
```

### Backend lifecycle

When `backend/src/server.ts` starts, it:

1. Loads environment variables and validates the PostgreSQL configuration.
2. Tests the database connection.
3. Loads the most recently saved state for every tag.
4. Starts the Express server (port `3000` by default).
5. Reads all active PLC/tag definitions from the database and starts a poller for each tag.
6. Starts the hourly snapshot scheduler.
7. On `SIGINT` or `SIGTERM`, stops timers, disconnects PLCs, closes the database pool, and exits.

PLC definitions are refreshed every 60 seconds by default. New tags receive pollers, removed or disabled tags lose their pollers, and pollers restart when a relevant configuration value changes. Reads for tags on the same PLC are queued because `nodes7` maintains mutable item state on each client.

The currently active service is `measurementServiceMinimal.ts`. Each successful poll updates an in-memory latest-value cache; it does **not** write every reading. At the next exact hour (`xx:00` in the backend host's local time), `hourlyMeasurementJob.ts` writes the latest cached value for every active tag. Its insert avoids duplicates with the same tag and timestamp.

The repository also contains a deadband-based implementation (`measurementService.ts`, `deadbandService.ts`, and `deadbandServiceMinimal.ts`). It can store the first reading, readings that exceed an absolute or percentage change threshold, or readings forced by a maximum interval. This implementation is retained in the source but is not wired into `server.ts` at present.

### Frontend lifecycle

The frontend is a client-rendered React application. `App.tsx` keeps the selected page in local state instead of using a routing library. The sidebar switches between Overview, Pipe Network, Trends, Alarms, System settings, and Reporting.

Only Reporting is currently connected to backend measurements. It:

- requests up to 1,000 recent measurements;
- refreshes automatically at the selected interval;
- filters the displayed records by local calendar date;
- groups records by PLC and paginates each PLC table; and
- requests a full date range from the reporting endpoint before creating an `.xlsx` export.

Overview currently displays hard-coded demonstration sites and metrics. Pipe Network, Trends, Alarms, and System settings are placeholder screens.

The selected light/dark theme is saved in browser `localStorage` under `flowops-theme`.

## Prerequisites

- Node.js with npm (a current LTS release is recommended).
- PostgreSQL reachable from the backend.
- Network access from the backend host to each Siemens S7 PLC on TCP port `102`.
- Database tables named `plc`, `plc_tag`, and `measurement` with the columns used by the repository queries.

This repository does not currently contain database migrations or seed files. The database schema must therefore be provisioned separately. At minimum, the code expects:

- `plc`: `id`, `name`, `ip_address`, `rack`, `slot`, `is_active`;
- `plc_tag`: `id`, `plc_id`, `tag_name`, `address_symbol`, `address_actual`, `data_type`, `unit`, `poll_interval`, `deadband_type`, `deadband_value`, `max_save_interval_seconds`, `is_active`;
- `measurement`: `id`, `tag_id`, `value_number`, `fetched_at`.

## Configuration

Create `backend/.env`:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scd
DB_USER=postgres
DB_PASSWORD=replace_me
DB_POOL_MAX=10

PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
PLC_CONFIG_REFRESH_MS=60000
```

Required values are `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The remaining values use the defaults shown above.

For normal local development, no frontend environment file is needed: Vite proxies `/api` to `http://localhost:3000`. When the API is hosted elsewhere, create `frontend/.env`:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

Do not add a trailing slash to `VITE_API_BASE_URL` (the client removes one if present).

## Install and run

Dependencies are managed independently in each application directory.

```powershell
cd backend
npm install
npm run dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend health check is available at `http://localhost:3000/api/health`.

## API

`GET`: `/api/health`: Returns backend status and the current server timestamp.

`GET`: `/api/measurements?limit=100&tagId=1&plcId=1`: Returns newest measurements. Filters are optional; `limit` defaults to 100 and is capped at 1,000.

`GET`: `/api/measurements/latest?tagId=1`: Returns the newest stored measurement for one tag.

`GET`: `/api/measurements/report?from=2026-08-01&to=2026-08-07`: Returns all measurements in an inclusive `YYYY-MM-DD` date range.

Invalid parameters return HTTP `400`; a missing latest measurement returns `404`.

## Libraries and their roles

### Frontend runtime

`react`: Builds the dashboard from stateful components and hooks.

`react-dom`: Mounts the React component tree into the browser DOM.

`exceljs`: Builds and downloads formatted Excel workbooks for measurement reports.

### Frontend development

`vite`: Development server, API proxy, asset pipeline, and production bundler.

`@vitejs/plugin-react`: Enables React/JSX transformation and Fast Refresh in Vite.

`typescript`: Performs static type checking and project builds.

`oxlint`: Checks source code for common correctness and style issues.

`@types/react`, `@types/react-dom`, `@types/node`: Type declarations used by TypeScript.

### Backend runtime

`express`: Hosts the health and measurement HTTP endpoints.

`cors`: Allows requests from the configured frontend origin.

`dotenv`: Loads backend configuration from `.env`.

`pg`: Provides the PostgreSQL connection pool and parameterized queries.

`nodes7`: Connects to Siemens S7 PLCs and reads configured tag addresses.

### Backend development

`tsx`: Runs TypeScript directly and restarts the backend after source changes.

`typescript`: Strict static type checking for backend source.

`@types/express`, `@types/cors`, `@types/node`, `@types/pg`: Type declarations used by TypeScript.

## npm scripts

Run these inside the relevant application directory.

### Frontend

`npm run dev`: Starts the Vite development server with hot reload.

`npm run build`: Type-checks the referenced TypeScript projects, then produces a production bundle in `frontend/dist/`.

`npm run lint`: Runs Oxlint over the frontend.

`npm run preview`: Serves the production bundle locally for inspection. Run `build` first.

### Backend

`npm run dev`: Runs `src/server.ts` with `tsx` watch mode.

`npm run typecheck`: Checks backend types without emitting JavaScript.

`npm test`: Placeholder only; it exits with an error because no test suite is configured.

There is currently no backend production build or start script.

## Source-file guide

### Backend scripts

`src/server.ts`: Application entry point; configures Express, starts jobs, and handles graceful shutdown.

`src/config/database.ts`: Validates database environment variables and owns the PostgreSQL pool.

`src/routes/measurementRoutes.ts`: Validates query parameters and implements measurement, latest-value, and report endpoints.

`src/repositories/tagRepository.ts`: Loads active PLC/tag configuration from `plc` and `plc_tag`.

`src/repositories/measurementRepository.ts`: Inserts snapshots and queries current, filtered, latest, and date-range measurements.

`src/jobs/plcPollingJob.ts`: Creates, updates, and removes per-tag polling timers; sends readings to the measurement service.

`src/jobs/hourlyMeasurementJob.ts`: Schedules exact-hour snapshots and bulk-inserts the latest cached values.

`src/services/plcService.ts`: Manages `nodes7` clients, serializes reads per PLC, validates numeric values, and disconnects clients.

`src/services/measurementServiceMinimal.ts`: Active measurement service; initializes saved state and caches the latest fetched value for hourly persistence.

`src/services/measurementService.ts`: Alternative, currently unused service that persists according to deadband decisions.

`src/services/deadbandService.ts`: Exhaustive deadband decision implementation; currently unused by the running server.

`src/services/deadbandServiceMinimal.ts`: Deadband implementation used by the alternative measurement service; inactive in the current hourly-only flow.

`src/types/plc.ts`: Shared backend types for PLC configuration, tags, read results, and measurements.

`src/types/nodes7.d.ts`: Local TypeScript declarations for the untyped `nodes7` API used by this project.

### Frontend scripts

`src/main.tsx`: Browser entry point; mounts the application in React Strict Mode.

`src/App.tsx`: Owns page selection, live clock, theme, and the main layout.

`src/api/measurementApi.ts`: Typed HTTP client for recent measurements and date-range reports.

`src/hooks/useMeasurements.ts`: Fetches measurements immediately and on a configurable interval; exposes loading/error state and manual refresh.

`src/hooks/useTheme.ts`: Applies and persists the light/dark theme.

`src/pages/layouts/Sidebar.tsx`: Navigation and operator sidebar.

`src/pages/layouts/Topbar.tsx`: System status, clock, notifications, and theme control.

`src/pages/monitoring/Overview.tsx`: Searchable/filterable demonstration overview using hard-coded site data.

`src/pages/monitoring/PipeNetwork.tsx`: Placeholder network-monitoring page.

`src/pages/monitoring/Trends.tsx`: Placeholder trends page.

`src/pages/monitoring/Alarms.tsx`: Placeholder alarms page.

`src/pages/management/SystemSetting.tsx`: Placeholder system-settings page.

`src/pages/logging/Reporting.tsx`: Live measurement table, date filtering, PLC grouping, pagination, refresh controls, and export workflow.

`src/helpers/exportMeasurementsExcel.ts`: Groups tag values into report rows, formats Jakarta timestamps, styles worksheets, and triggers `.xlsx` downloads.

`src/helpers/Calculations.tsx`: Shared locale-aware numeric formatting helper.

`src/utils/NonLibShapes.tsx`: Inline SVG icon component used instead of an icon library.

`src/utils/ScdTypes.tsx`: Shared frontend page, theme, pipe, and status types.

`src/index.css`: Global font, reset, and document-level styles.

`src/App.css`: Dashboard layout, components, responsive behavior, and light/dark theme styles.

### Configuration and static files

`frontend/vite.config.ts`: Enables the React plugin and proxies development `/api` calls to port 3000.

`frontend/tsconfig*.json`: TypeScript settings for browser code, Vite configuration, and project references.

`backend/tsconfig.json`: Strict Node/TypeScript settings for backend source.

`frontend/index.html`: HTML shell containing the React mount point.

`public/` and `frontend/src/assets/`: Static icons and image assets.

## Production notes

`npm run build` creates the frontend bundle, but this repository does not define how that bundle or the backend is deployed. Before production use, add a backend compilation/start workflow, provision the database schema, restrict CORS to the deployed frontend, keep credentials outside source control, and run the backend on a host that can reach both PostgreSQL and the PLC network.
