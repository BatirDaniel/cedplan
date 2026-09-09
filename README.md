# CEDPlan

Aplicație de management de proiecte (inspirată de OpenProject) — React + ASP.NET Core Web API + SQL Server.

## Structură

- `server/CedPlan.Api` — API REST ASP.NET Core 10, EF Core, autentificare JWT, SQL Server
- `client` — aplicație React 19 + TypeScript + Vite, Tailwind CSS 4

## Funcționalități

- Autentificare (înregistrare/login) cu JWT
- Proiecte cu membri și roluri (Vizitator / Membru / Administrator / Proprietar)
- Sarcini (work packages): tip, status, prioritate, responsabil, date, ore estimate, progres
- Tabel de sarcini cu filtrare și căutare
- Board Kanban cu drag & drop
- Diagramă Gantt
- Wiki per proiect
- Urmărire timp lucrat + rapoarte

## Rulare locală

### Backend (API)

Necesită .NET SDK 10 și un SQL Server local (folosește instanța implicită `localhost` cu autentificare Windows — vezi `appsettings.json`).

```bash
cd server/CedPlan.Api
dotnet run
```

API-ul pornește pe `http://localhost:5102`. Baza de date `CedPlanDb` și schema sunt create automat la pornire (migrații EF Core aplicate în `Program.cs`).

Swagger UI: `http://localhost:5102/swagger`

### Frontend (React)

Necesită Node.js 20+.

```bash
cd client
npm install
npm run dev
```

Aplicația pornește pe `http://localhost:5173`.

## Configurare

- Connection string SQL Server: `server/CedPlan.Api/appsettings.json` → `ConnectionStrings:DefaultConnection`
- Cheie JWT: `server/CedPlan.Api/appsettings.json` → `Jwt:Key` (schimbă în producție)
- URL API în frontend: `client/src/api/client.ts` → `API_BASE_URL`
