@AGENTS.md
# CampusConnect – Claude Kontext

## Was ist CampusConnect?
Mobile-first Web-App für Studierende und Hochschulen.
Studierende können Events, Angebote und Aktionen ihrer Hochschule sehen, teilen und kommentieren.
Feeds sind pro Hochschule isoliert – Studierende sehen nur Inhalte ihrer eigenen Hochschule.

---

## Tech-Stack
| Was | Womit |
|---|---|
| Framework | Next.js 16 (App Router) |
| Datenbank | SQLite (better-sqlite3) |
| ORM | Drizzle |
| Styling | Tailwind CSS |
| Auth | NextAuth.js |
| E-Mail | Nodemailer (Gmail SMTP) |
| KI | OpenAI API (GPT-4.1, Whisper, DALL-E) |

---

## Design-System
- **Primärfarbe:** Orange `#FF6B35`
- **Hintergrund:** Weiß `#ffffff` / Hell `#f5f5f5`
- **Text:** Dunkel `#1a1a1a`
- **Mobile-first:** max-width `390px`, zentriert, min-height `100dvh`
- **Inputs:** Rounded (`rounded-2xl`), leichter Border, padding `px-4 py-3`
- **Buttons:** Rounded (`rounded-2xl`), orange Hintergrund, weißer Text, volle Breite
- **Cards:** Weiß, rounded (`rounded-2xl`), leichter Shadow
- **Bottom Navigation:** Feed / + (Posten) / Profil – nur bei eingeloggten Student-Screens
- **Admin-Screens:** Orange Header-Bar
- **Student-Screens:** Weißer Header

### Kategorien & Farben
| Kategorie | Farbe |
|---|---|
| Party | Lila `#8B5CF6` |
| Sport | Blau `#3B82F6` |
| Vortrag | Orange `#F59E0B` |
| Karriere | Grau `#6B7280` |
| Gesundheit | Grün `#10B981` |
| Sonstiges | Grau `#9CA3AF` |

---

## Rollen & Business Logic

### Student
- Registrierung mit Hochschul-E-Mail
- System erkennt Hochschule automatisch anhand der E-Mail-Domain
- Kann Events posten (Foto + optionale Sprachaufnahme → KI extrahiert Eventdaten)
- Kann kommentieren, liken, bookmarken
- Sieht nur Events seiner eigenen Hochschule

### Admin (Hochschule)
- Registriert sich zuerst → legt Hochschule + studentische E-Mail-Domain an
- Nur 1 Admin pro Hochschule
- Kann Events moderieren (bearbeiten / löschen), nicht selbst posten
- Login gleich wie Student – System erkennt anhand E-Mail ob Admin oder Student

### Kernregeln
1. Admin muss zuerst existieren bevor Studenten sich registrieren können
2. Student registriert sich → Domain-Check → keine passende Hochschule → Fehlermeldung
3. Alle DB-Abfragen filtern nach `university_id` des eingeloggten Users
4. Login-Flow: E-Mail eingeben → System prüft ob Admin oder Student → weiterleiten

---

## Datenbankschema (SQLite)
```sql
universities (
  id, name, email_domain, contact_name, contact_email, password, created_at
)

users (
  id, email, name, password, university_id → universities.id, created_at
)

events (
  id, title, category, date, start_time, end_time,
  location, description, image_url, source_notes,
  university_id → universities.id,
  author_id → users.id,
  created_at
)

comments (
  id, content, event_id → events.id, author_id → users.id,
  created_at, updated_at
)

likes     ( id, event_id, user_id, created_at )
bookmarks ( id, event_id, user_id, created_at )
```

**Kategorien:** `Vortrag` | `Sport` | `Party` | `Karriere` | `Gesundheit` | `Sonstiges`

---

## Ordnerstruktur
```
campus_connect/
├── CLAUDE.md
├── campusconnect.sqlite3
├── setup.py
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── register.tsx              ← Rollenauswahl + E-Mail eingeben (NEU)
    │   │   ├── login.tsx                 ← Login für Admin + Student
    │   │   ├── verify.tsx                ← E-Mail bestätigen
    │   │   ├── complete-profile-student.tsx
    │   │   └── complete-profile-admin.tsx
    │   ├── (admin)/
    │   │   ├── dashboard.tsx             ← Alle Events moderieren
    │   │   ├── events.tsx                ← Event bearbeiten/löschen
    │   │   └── settings.tsx              ← Hochschule + Passwort bearbeiten
    │   ├── (student)/
    │   │   ├── feed/
    │   │   │   └── page.tsx              ← Event-Feed
    │   │   ├── feed/[eventId].tsx        ← Event Detail
    │   │   ├── calendar.tsx              ← Kalender Monats/Wochenansicht
    │   │   ├── post.tsx                  ← Event teilen (Foto + Voice + KI)
    │   │   └── profile.tsx              ← Profil + eigene Events
    │   ├── (mails)/
    │   │   ├── student_mail.tsx          ← E-Mail Template Student
    │   │   └── admin_mail.tsx            ← E-Mail Template Admin
    │   └── api/
    │       ├── auth/route.ts
    │       ├── events/route.ts
    │       ├── events/[id]/route.ts
    │       ├── comments/route.ts
    │       ├── universities/route.ts
    │       ├── users/route.ts
    │       └── likes/route.ts
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Card.tsx
    │   │   └── CategoryChip.tsx
    │   ├── feed/
    │   │   ├── EventCard.tsx
    │   │   ├── FeedFilter.tsx
    │   │   └── SortDropdown.tsx
    │   ├── event/
    │   │   ├── EventDetail.tsx
    │   │   └── CommentItem.tsx
    │   ├── post/
    │   │   ├── PhotoPicker.tsx
    │   │   ├── VoiceRecorder.tsx
    │   │   └── ReviewForm.tsx
    │   └── layout/
    │       ├── Header.tsx
    │       └── BottomNav.tsx
    ├── db/
    │   ├── schema.ts
    │   ├── index.ts
    │   └── migrations/
    └── lib/
        ├── auth.ts
        ├── email.ts
        ├── utils.ts
        └── validations.ts
```

---

## Screens & Flows (Referenz: CampusConnect.pdf im Projektordner)

### Auth-Flow (Neu)
```
register.tsx → Rolle wählen (Student / Hochschule) → E-Mail eingeben
  → verify.tsx → E-Mail bestätigen
  → complete-profile-student.tsx ODER complete-profile-admin.tsx
  → feed ODER dashboard
```

### Auth-Flow (Bestehend)
```
login.tsx → E-Mail + Passwort
  → System prüft: Admin (universities) oder Student (users)?
  → (admin)/dashboard ODER (student)/feed
```

### Post-Flow (KI-gestützt)
```
post.tsx →
  1. Foto aufnehmen oder auswählen
  2. Sprachaufnahme (Whisper → Text) ODER Text eingeben
  3. OpenAI extrahiert: Titel, Datum, Uhrzeit, Ort, Kategorie, Beschreibung
  4. Optional: KI-Titelbild generieren (DALL-E)
  5. Review + Bearbeiten
  6. Event posten → Feed
```

---

## KI-Integration (OpenAI)
Die KI-Logik ist bereits als Flask-Demo vorhanden (`app.py`) und wird in Next.js API Routes übernommen:

| Endpoint | Modell | Funktion |
|---|---|---|
| `/api/events` POST | `gpt-4.1-mini` | Event aus Foto + Text extrahieren |
| `/api/transcribe` | `gpt-4o-mini-transcribe` | Sprachaufnahme → Text |
| `/api/generate-image` | `gpt-image-1` | Titelbild generieren |

**Umgebungsvariablen (.env.local):**
```
OPENAI_API_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## Aktuelle Phase
**Phase 2 – Mockups mit Dummy-Daten**

Alle Screens werden als echte Next.js Pages gebaut mit hardcodierten Dummy-Daten.
Noch keine echten API-Calls, keine DB-Anbindung.

### Reihenfolge der Mockups
- [ ] Login (`(auth)/login.tsx`)
- [ ] Register (`(auth)/register.tsx`)
- [ ] Verify (`(auth)/verify.tsx`)
- [ ] Complete Profile Student (`(auth)/complete-profile-student.tsx`)
- [ ] Complete Profile Admin (`(auth)/complete-profile-admin.tsx`)
- [ ] Feed (`(student)/feed/page.tsx`)
- [ ] Event Detail (`(student)/feed/[eventId].tsx`)
- [ ] Kommentare (innerhalb Event Detail)
- [ ] Kalender (`(student)/calendar.tsx`)
- [ ] Post (`(student)/post.tsx`)
- [ ] Profil Student (`(student)/profile.tsx`)
- [ ] Admin Dashboard (`(admin)/dashboard.tsx`)
- [ ] Admin Events (`(admin)/events.tsx`)
- [ ] Admin Settings (`(admin)/settings.tsx`)

### Mockup-Regeln
- `"use client"` oben
- Dummy-Daten hardcoded in der Datei
- `useState` für interaktive Elemente
- Kein echter API-Call
- Sieht aus wie die finale App
- Orientierung am PDF (CampusConnect.pdf)

---

## Wichtige Hinweise für Claude Code
- Immer mobile-first, max-width 390px, zentriert mit `mx-auto`
- Tailwind CSS für alles
- Keine externen UI-Libraries (kein shadcn, kein MUI)
- Deutsche Texte überall (die App ist auf Deutsch)
- Bilder als Platzhalter: `bg-gray-200` oder `https://picsum.photos/400/200`
- Icons: Lucide React (`import { ... } from 'lucide-react'`) ist bereits installiert
- Bestehende Dateien nicht überschreiben ohne zu fragen