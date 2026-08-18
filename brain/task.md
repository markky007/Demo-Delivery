# QR Food Ordering — Task Tracker

## Phase 1: Project Initialization

- `[x]` Initialize Quasar project (Vue 3, TS, Vite, Pinia)
- `[x]` Install dependencies (Supabase, QR code lib, @types/qrcode)
- `[x]` Configure environment variables (`.env.example`, `.env`)
- `[x]` Set up Supabase boot file & client
- `[x]` Set up project folder structure & global styling

## Phase 2: Database Schema

- `[x]` Create all SQL migration files (tables, sequences, indexes)
- `[x]` Create database functions (create_order, update_order, advance_order_status with FIFO enforcement, close_table_session)
- `[x]` Create RLS policies (Owner full CRUD, Anonymous customer scoped)
- `[x]` Create seed data (Restaurant, 5 Tables with QR tokens, 5 Categories, 12 Items, 4 Option Groups, 15 Options)

## Phase 3: Core Types & Services

- `[x]` Define TypeScript enums and types (`database.ts`, `enums.ts`, `cart.ts`)
- `[x]` Create Supabase service layer (`tableService.ts`, `menuService.ts`, `orderService.ts`, `sessionService.ts`, `billService.ts`)
- `[x]` Create composables (`useNotify.ts`)
- `[x]` Create Pinia stores (`sessionStore.ts`, `cartStore.ts`, `menuStore.ts`, `queueStore.ts`, `authStore.ts`)

## Phase 4: Layouts & Routing

- `[x]` Create CustomerLayout (mobile-first, table header, sticky cart bar)
- `[x]` Create OwnerLayout (collapsible sidebar, live clock, operational nav)
- `[x]` Create BlankLayout (login, error states)
- `[x]` Set up router with customer + owner routes
- `[x]` Auth guard for owner routes

## Phase 5: Customer Flow (Critical Path)

- `[x]` Welcome page (QR landing, table session join/create)
- `[x]` Menu browsing page (category tabs, sold-out states, cards grid)
- `[x]` Product detail page (single/multi option groups, special notes, quantity picker)
- `[x]` Cart page (item list, quantity adjust, confirm order with RPC)
- `[x]` Order tracking (realtime status in Thai labels, session total)
- `[x]` Order detail page (snapshotted prices, items, options)

## Phase 6: Owner Flow (Critical Path)

- `[x]` Login page (Supabase Auth email/password)
- `[x]` Order queue (realtime 4-column Kanban, FIFO serving gate enforcement)
- `[x]` Table management + QR (generate, preview, download, print, regenerate)
- `[x]` Menu management (category & item CRUD, sold-out quick toggle)
- `[x]` Option management (option group & option CRUD)
- `[x]` Bill management (active session review, mark paid, close session)
- `[x]` Dashboard (today's sales, order stats, queue status counters)
- `[x]` Sales history (date range filtering, bills table)
