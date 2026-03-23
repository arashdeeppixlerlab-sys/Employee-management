You are a senior React Native + TypeScript architect.

Your task is to DESIGN a production-grade Employee Management App architecture using:
- React Native (Expo SDK 54 ONLY)
- TypeScript (strict mode)
- Expo Router
- Supabase (Auth + Postgres + Storage)
- React Native Paper

Do NOT generate full app implementation blindly.
Focus on clean architecture, correctness, and scalability.

--------------------------------------------------
:lock: CORE ARCHITECTURE RULES
--------------------------------------------------

1. Strict Separation of Concerns
- Screens → UI + navigation ONLY
- Services → ALL Supabase interactions
- Hooks → business logic + state handling
- Components → reusable UI

2. NEVER access Supabase directly inside screens.

3. Enforce NULL-SAFE coding everywhere
- Handle missing profile cases
- Avoid undefined crashes
- Always provide fallbacks

4. Use strict TypeScript
- No `any` unless unavoidable
- Strong typing across services, hooks, and models

5. Expo SDK 54 Compatibility
- Avoid libraries requiring RN > 0.69
- Supabase client must be compatible with React Native

--------------------------------------------------
:file_folder: PROJECT STRUCTURE (FIXED)
--------------------------------------------------

src/
  components/
    EmployeeCard.tsx
    DocumentCard.tsx
    FormInput.tsx
    LoadingSpinner.tsx

  screens/
    login/
      LoginScreen.tsx
    employee/
      EmployeeDashboard.tsx
      ProfileForm.tsx
      DocumentUpload.tsx
    admin/
      AdminDashboard.tsx
      EmployeeList.tsx
      EmployeeDetails.tsx

  services/
    supabase/
      supabaseClient.ts
    authService.ts
    employeeService.ts
    documentService.ts

  hooks/
    useAuth.ts
    useEmployee.ts        // FIX: singular (not useEmployees)
    useDocuments.ts

  types/
    employee.ts
    document.ts
    auth.ts

  utils/
    profileCompletion.ts

app/ (Expo Router routing layer)

--------------------------------------------------
:bar_chart: DATABASE SCHEMA (CORRECTED)
--------------------------------------------------

IMPORTANT FIXES:
- Ensure uuid extension is enabled
- Avoid policy recursion issues
- Use secure admin checks

SQL:

-- Required extension
create extension if not exists "uuid-ossp";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  phone text,
  department text,
  address text,
  role text not null check (role in ('admin','employee')),
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references profiles(id) on delete cascade,
  name text not null,
  file_url text not null,
  uploaded_at timestamptz default now()
);

--------------------------------------------------
:closed_lock_with_key: RLS POLICIES (FIXED – NO RECURSION BUG)
--------------------------------------------------

alter table profiles enable row level security;
alter table documents enable row level security;

-- Employees: own profile
create policy "employee_profile_access"
on profiles for all
using (auth.uid() = id);

-- Admin access (SAFE CHECK)
create policy "admin_profile_access"
on profiles for all
using (
  auth.uid() IN (
    select id from profiles where role = 'admin'
  )
);

-- Employees: own documents
create policy "employee_documents_access"
on documents for all
using (auth.uid() = employee_id);

-- Admin: all documents
create policy "admin_documents_access"
on documents for all
using (
  auth.uid() IN (
    select id from profiles where role = 'admin'
  )
);

--------------------------------------------------
:warning: SUPABASE CLIENT (RN SAFE)
--------------------------------------------------

CRITICAL FIX:
React Native requires async storage support.

Use:

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

--------------------------------------------------
:package: TYPE DEFINITIONS (SAFE)
--------------------------------------------------

Ensure all optional fields are handled safely.

Employee:
- nullable-safe access required in UI

Document:
- file_url must always exist before usage

AuthUser:
- email can be nullable → handle safely

--------------------------------------------------
:brain: SERVICE LAYER RULES
--------------------------------------------------

1. Always handle errors explicitly
2. Always return typed responses
3. Never assume data exists
4. Use `.maybeSingle()` where safer than `.single()`

CRITICAL FIXES:
- Avoid crashes when profile not found
- Validate before returning

--------------------------------------------------
:open_file_folder: DOCUMENT HANDLING (EXPO FIX)
--------------------------------------------------

CRITICAL ISSUE FIXED:

React Native DOES NOT support `File`.

Use:
- Expo Document Picker
- Upload via Blob or ArrayBuffer

Rules:
- Convert picked file → Blob
- Validate file type & size before upload
- Use signed URLs for:
  - preview
  - download
  - export

Storage path:
documents/{employeeId}/{documentId}

--------------------------------------------------
:jigsaw: HOOKS RULES
--------------------------------------------------

- Always include:
  loading state
  error state
- Wrap async calls in try/catch
- Prevent memory leaks (cleanup in useEffect)

--------------------------------------------------
:abacus: PROFILE COMPLETION (FIXED)
--------------------------------------------------

Avoid `any`.

Use typed approach:

- Only count defined fields
- Ensure safe access

Fields:
name (required)
phone
department
address

--------------------------------------------------
:repeat: AUTH FLOW (STRICT)
--------------------------------------------------

Login →
Supabase Auth →
Fetch profile →
Determine role →
Route via Expo Router

IMPORTANT:
- Handle case where profile does NOT exist
- Prevent app crash

--------------------------------------------------
:art: UI RULES
--------------------------------------------------

Use React Native Paper ONLY:
- Button
- TextInput
- Card
- List
- Avatar
- Divider

Design:
- minimal
- clean
- professional

--------------------------------------------------
:warning: VALIDATION & SAFETY
--------------------------------------------------

Must handle:
- empty inputs
- invalid email
- missing profile
- failed uploads
- expired signed URLs

--------------------------------------------------
:signal_strength: PERFORMANCE
--------------------------------------------------

- Use FlatList for lists
- Avoid unnecessary re-renders
- Cache where needed via hooks

--------------------------------------------------
:no_entry_sign: COMMON MISTAKES TO AVOID
--------------------------------------------------

- Using File API (not supported in RN)
- Calling Supabase inside screens
- Using `.single()` without fallback
- Missing AsyncStorage in Supabase client
- RLS recursion issues
- Not initializing profile on signup
- Ignoring null safety

--------------------------------------------------
:dart: GOAL
--------------------------------------------------

Produce a clean, scalable, production-ready architecture blueprint
that can be safely implemented phase-by-phase without refactoring.