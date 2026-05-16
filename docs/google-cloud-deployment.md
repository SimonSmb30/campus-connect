# Google Cloud Deployment

Diese App ist fuer Google Cloud Run mit Cloud SQL PostgreSQL und Cloud Storage vorbereitet.

## Services

- Cloud Run: Next.js App
- Cloud SQL: PostgreSQL Datenbank
- Cloud Storage: generierte Event-Bilder

## Environment Variables

Pflicht:

```bash
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=https://your-domain.example
GMAIL_USER=your-smtp-user
GMAIL_APP_PASSWORD=your-smtp-app-password
OPENAI_API_KEY=your-openai-api-key
```

Cloud Run mit Cloud SQL Unix Socket:

```bash
CLOUD_SQL_CONNECTION_NAME=project-id:region:instance-name
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/DATABASE
```

Cloud Storage fuer generierte Bilder:

```bash
GCS_BUCKET_NAME=your-public-assets-bucket
```

Wenn `GCS_BUCKET_NAME` nicht gesetzt ist, speichert die App generierte Bilder lokal unter
`public/uploads/generated`. Das ist nur fuer lokale Entwicklung gedacht.

## Initial Database Setup

1. Cloud SQL PostgreSQL Instanz, Datenbank und User anlegen.
2. Lokal per Cloud SQL Auth Proxy oder direkter Verbindung `DATABASE_URL` setzen.
3. Tabellen anlegen:

```bash
npm run db:migrate
```

4. Bestehenden lokalen Admin aus SQLite uebernehmen:

```bash
SQLITE_IMPORT_PATH=./campusconnect.sqlite3 npm run db:import-sqlite
```

Der erwartete importierte Startzustand ist:

- `universities`: 1 Eintrag
- `users`, `events`, `comments`, `likes`, `bookmarks`, `comment_likes`, `moderation_logs`: 0 Eintraege

## Cloud Run Permissions

Der Cloud Run Service Account braucht:

- `Cloud SQL Client` fuer die Datenbankverbindung
- Schreibzugriff auf den Storage Bucket, z.B. `Storage Object User`

Der Storage Bucket muss fuer die ausgelieferten Bild-URLs oeffentlich lesbar sein oder ueber eine
eigene CDN-/Proxy-Loesung oeffentlich bereitgestellt werden. Die App gibt fuer generierte Bilder
`https://storage.googleapis.com/<bucket>/uploads/generated/<file>.png` zurueck.

## Production Checks

Vor dem Go-live:

```bash
npm run build
npm run lint
```

Zusaetzlich auf iOS Safari und Android Chrome testen:

- Registrierung als Student
- Verify-Link aus E-Mail
- Login und Session-Cookie
- Feed laden
- Event erstellen
- KI-Bild generieren und anzeigen
