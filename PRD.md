# Product Requirements Document
# Office Car Booking System

**Version:** 1.0  
**Date:** 2026-07-08  
**Status:** Draft

---

## 1. Overview

A lightweight, fast web application for scheduling and managing office car bookings. Employees can view availability on a calendar, make bookings, and managers/admins can oversee all reservations.

---

## 2. Goals

- Eliminate double-booking of office vehicles
- Provide a public-facing dashboard so anyone (without login) can see car availability
- Make booking fast — minimal steps from intent to confirmed reservation
- Simple admin interface for managing users, cars, and divisions
- Built on SQLite for portability; schema designed for easy migration to MySQL/PostgreSQL

---

## 3. User Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access: manage users, cars, divisions; view/edit/delete all bookings |
| **Manager** | View all bookings in their division; approve/reject if approval flow is enabled |
| **User** | Create, view, and cancel their own bookings |

---

## 4. Features

### 4.1 Public Dashboard (No Login Required)

- Accessible at `/` (root URL)
- Shows a **read-only calendar** of all current and upcoming bookings
- Displays car availability by day/week
- Shows a summary: total cars, available now, booked today
- "Book a Car" CTA button → redirects to login if not authenticated, then to booking form
- No personal/private details exposed (only car name, time slot, status)

### 4.2 Authentication

- Email + password login
- Session-based auth (JWT stored in HTTP-only cookie)
- Role assigned at account creation by admin
- Password reset via email (optional v1)

### 4.3 Booking

**Create Booking:**
- Select car (shows only available cars for chosen time)
- Title (e.g., "Client Visit to HQ")
- Description (optional, purpose of trip)
- Date & Start Time
- Duration (timeline): 30 min / 1 hr / 2 hr / 4 hr / Full Day or custom
- Auto-calculates end time
- Instant conflict check before submission
- Confirmation screen before final submit

**Booking States:**
- `pending` → `approved` → `completed`
- `pending` → `rejected`
- `approved` → `cancelled`

**Booking Information Fields:**
| Field | Type | Required |
|-------|------|----------|
| Title | Text (max 100 chars) | Yes |
| Description | Textarea (max 500 chars) | No |
| Car | Select (filtered by availability) | Yes |
| Date | Date picker | Yes |
| Start Time | Time picker | Yes |
| Duration / Timeline | Select + custom option | Yes |
| End Time | Auto-calculated, read-only | — |

### 4.4 Calendar View

- Default view: **Week view**
- Toggle: Day / Week / Month
- Color-coded by status (pending=yellow, approved=green, cancelled=grey)
- Click on a booking slot to see details
- Click on an empty slot to open booking form pre-filled with that time
- Filter by: Car, Division, User (admin/manager only)

### 4.5 Booking List (Last 10 + Pagination)

- Table showing most recent bookings
- Columns: Car, Title, Date, Start–End Time, Duration, Status, Booked By
- Default: last 10 entries
- Pagination: 10 per page, with page controls
- Sortable by date, status
- Filter by status, date range, car

### 4.6 Dashboard (Authenticated)

- **Summary cards:**
  - Total bookings today
  - Cars available now
  - Pending approvals (manager/admin)
  - My upcoming bookings
- **Mini calendar** (week view, highlighted today)
- **Recent bookings list** (last 10, with paging)
- **Quick Book** button → opens booking modal inline

### 4.7 Master Data — Admin Only

**Users:**
- Fields: Full Name, Email, Password (hashed), Role (admin/manager/user), Division, Phone, Active/Inactive
- CRUD operations
- Bulk import via CSV (optional v2)

**Divisions:**
- Fields: Division Name, Division Code, Description
- CRUD operations

**Cars:**
- Fields: Car Name, License Plate, Type/Category, Capacity, Status (available/maintenance)
- CRUD operations

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | **Next.js 14** (App Router) + **Tailwind CSS** |
| Backend | Next.js API Routes (REST) |
| Database | **SQLite** via **Prisma ORM** |
| Auth | **NextAuth.js** (credentials provider) |
| Calendar UI | **FullCalendar** (open source) |
| State | React Query (server state) + Zustand (client state) |

### 5.2 Database Migration Strategy

Prisma is used as the ORM layer. Switching from SQLite to MySQL or PostgreSQL requires only:
1. Change `DATABASE_URL` in `.env`
2. Change `provider = "sqlite"` to `"mysql"` or `"postgresql"` in `schema.prisma`
3. Run `prisma migrate deploy`

No application code changes needed.

### 5.3 Database Schema (Prisma)

```prisma
model User {
  id         Int       @id @default(autoincrement())
  name       String
  email      String    @unique
  password   String
  role       Role      @default(USER)
  phone      String?
  active     Boolean   @default(true)
  divisionId Int
  division   Division  @relation(fields: [divisionId], references: [id])
  bookings   Booking[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model Division {
  id    Int    @id @default(autoincrement())
  name  String
  code  String @unique
  desc  String?
  users User[]
}

model Car {
  id        Int       @id @default(autoincrement())
  name      String
  plate     String    @unique
  type      String
  capacity  Int
  status    CarStatus @default(AVAILABLE)
  bookings  Booking[]
}

model Booking {
  id          Int           @id @default(autoincrement())
  title       String
  description String?
  userId      Int
  user        User          @relation(fields: [userId], references: [id])
  carId       Int
  car         Car           @relation(fields: [carId], references: [id])
  startTime   DateTime
  endTime     DateTime
  durationMin Int
  status      BookingStatus @default(PENDING)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum Role { ADMIN MANAGER USER }
enum BookingStatus { PENDING APPROVED REJECTED CANCELLED COMPLETED }
enum CarStatus { AVAILABLE MAINTENANCE }
```

---

## 6. Pages & Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Public dashboard — calendar + availability |
| `/login` | Public | Login page |
| `/dashboard` | Auth | Personal dashboard |
| `/bookings` | Auth | List view with paging |
| `/bookings/new` | Auth | Create booking form |
| `/bookings/[id]` | Auth | Booking detail / edit / cancel |
| `/calendar` | Auth | Full calendar view |
| `/admin/users` | Admin | User management |
| `/admin/divisions` | Admin | Division management |
| `/admin/cars` | Admin | Car management |
| `/manager/approvals` | Manager+ | Pending approval queue |

---

## 7. UX Principles

- **3-click booking:** Dashboard → Quick Book → Confirm
- **Conflict-free:** Available cars only shown for selected time slot
- **Visual availability:** Calendar uses color blocks, empty slots clearly visible
- **Mobile-friendly:** Responsive layout, touch-friendly calendar
- **Fast:** API responses < 200ms on SQLite; static public dashboard cached

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load | < 1.5s (initial), < 300ms (navigation) |
| API response | < 200ms (read), < 500ms (write) |
| Concurrent users | 50+ without degradation |
| Uptime | 99.5% |
| Data retention | All booking history retained indefinitely |
| Security | Passwords bcrypt-hashed, CSRF protected, role-based route guards |

---

## 9. Out of Scope (v1)

- Mobile native app
- Push/email notifications
- Recurring bookings
- GPS tracking
- Multi-office / multi-location
- SSO / OAuth login

---

## 10. Milestones

| Phase | Deliverable | Est. Duration |
|-------|-------------|---------------|
| 1 | DB schema + auth + user CRUD | 2 days |
| 2 | Booking CRUD + conflict check | 2 days |
| 3 | Calendar view + public dashboard | 2 days |
| 4 | Dashboard + list + pagination | 1 day |
| 5 | Admin master data pages | 1 day |
| 6 | Polish, testing, deployment | 1 day |

**Total estimated:** ~9 working days
