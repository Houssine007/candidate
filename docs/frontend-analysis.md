# 🎨 Frontend Analysis — RecruitPRO

> Analyse des deux frontends Next.js : l'UI RH (`frontend/`) et le LMS (`lms/`).
> Lecture seule, 2026-06-14.

## 1. Deux applications Next.js distinctes

| | Frontend RH | LMS |
|---|---|---|
| Dossier | `frontend/` | `lms/` |
| Next.js | 15.1.5 | 16.0.7 |
| React | 19.0.0 | 19.2.0 |
| Tailwind | v3 (`tailwind.config.js`) | v4 (`@tailwindcss/postcss`) |
| État | Zustand (`zustand` 5) | localStorage + hooks |
| Backend appelé | FastAPI :8000 (+ LMS :3001) | ses propres routes API + MongoDB |
| Login | **Oui (unique)** | Non (SSO via `?token=`) |

---

## 2. Frontend RH (`frontend/src/`)

### 2.1 Arborescence (App Router)
```
app/
├── layout.tsx            ThemeProvider (dark/light via next-themes)
├── page.tsx              Landing (334 l.) — getLatestJobs (public)
├── login/page.tsx        148 l. — seul point d'entrée des 3 apps
├── signup/page.tsx       188 l. — rôle CANDIDATE ou RECRUITER
└── dashboard/
    ├── candidate/        page + onboarding/   (profil, matches, suivi)
    ├── employee/         page + formations/ + mobilite/
    └── recruiter/        page + applications/[jobId] (Kanban)
                          + candidates/[id] + candidates/1 (figé) + candidates/1/page.tsx.tmp
                          + employees/ + organization/ + formations/
                          + jobs/create/ + jobs/new/
components/   theme-provider.tsx, theme-toggle.tsx
lib/          api.ts (713 l.), auth-store.ts (30 l.)
```

### 2.2 Gestion de l'état & auth (`lib/auth-store.ts`)
Store Zustand **persisté** (`persist`, clé `recruitpro-auth`) :
```ts
{ user: AuthUser | null, token: string | null, setAuth(), logout() }
```
`AuthUser` = `{ id, email, full_name, role, is_instructor? }`. Le `token` JWT est conservé
ici et passé en `Authorization: Bearer` à chaque appel ; il sert aussi de jeton SSO vers le LMS.

### 2.3 Client API (`lib/api.ts`, 713 lignes)
Fichier central : **toutes** les fonctions d'accès réseau + tous les types TS. Constantes
`API_BASE = http://localhost:8000` (en dur) et `LMS_BASE = NEXT_PUBLIC_LMS_URL || :3001`.

~50 fonctions exportées, regroupées par domaine :
| Domaine | Fonctions clés |
|---|---|
| Auth | `login`, `register`, `testConnection` |
| Jobs / matching | `getLatestJobs`, `getJob`, `getRecruiterJobsWithMatches`, `getInternalMatches` |
| Candidatures | `getJobApplications`, `getMyApplications`, `updateApplicationStatus`, `inviteCandidate`, `applyToJob` |
| Profil candidat | `getMyProfile`, `updateMyProfile`, `updateCandidateOnboarding`, `getCandidate`, `uploadCV` |
| Skills / catalog | `getSkills`, `searchSkills`, `suggestJobStandards` |
| Jobs (création) | `createJob` |
| Org / employés | `getOrgTree`, `createOrgUnit`, `getEmployees`, `createEmployee`, `updateEmployee`, `deleteEmployee`, `getEmployee`, `getInternalRoles`, `confirmHire` |
| LMS (pont) | `lmsLaunchUrl`, `getLMSCourses`, `getEmployeeEnrollments`, `assignCourse`, `setInstructor` |
| RH self | `getEmployeeMe`, `getUserPermissions` |
| Mobilité | `getInternalPositions`, `getInternalPosition`, `getMyInternalApplications`, `applyToPosition` |
| Formations | `getTrainingsCatalog`, `getMyTrainingEnrollments`, `getTraining` |

Types riches reflétant l'API : `Job`, `MatchResult`, `Gap`, `MatchDetails`, `CandidateProfile`,
`Application`, `Employee`, `OrgUnitTree`, `InternalRole`, `Recommendation`, `LMSCourse`,
`InternalPosition`, `Training`, etc.

### 2.4 Pont SSO vers le LMS
`lmsLaunchUrl(token, path)` construit `${LMS_BASE}${path}?token=…`. L'UI RH ouvre ainsi le
LMS en transmettant le JWT ; le LMS le capte (`SsoTokenCapture`). Aucune ré-authentification.

### 2.5 Parcours par rôle
- **CANDIDATE** : landing → signup/login → `dashboard/candidate` (profil + score complétude,
  offres avec score de match) → `onboarding` (formulaire 4 étapes) → suivi candidatures.
- **RECRUITER / ADMIN** : `dashboard/recruiter` (offres + compteurs) →
  `applications/[jobId]` (Kanban 5 colonnes, score par candidat, deep-dive des gaps) →
  `candidates/[id]` (profil complet) ; `jobs/create`|`new` ; `organization` (arbre récursif
  `OrgUnitRow`, assignation employés + rôles) ; `employees` ; `formations` (assignation LMS).
- **EMPLOYEE** : `dashboard/employee` → `formations` (catalogue LMS / trainings) +
  `mobilite` (postes internes + candidatures).

### 2.6 Design
Thème sombre/clair (`next-themes` + `theme-provider`/`theme-toggle`), Tailwind v3,
icônes `lucide-react`, esthétique « glassmorphism premium » (cf. `PROGRESS.md`).

---

## 3. LMS (`lms/app/`)

### 3.1 Arborescence
```
app/
├── layout.tsx · page.tsx
├── api/                  22 routes (voir api-analysis.md §7) — c'est le backend du LMS
├── components/           SsoTokenCapture.tsx, InstructorLayout.tsx, ConfirmDialog.tsx
├── hooks/                useConfirmDialog.ts
├── courses/page.tsx      catalogue apprenant
├── dashboard/page.tsx    tableau de bord apprenant
└── instructor/           page + courses (create, [id]/edit, [id]/settings) + categories + profile + settings
lib/      auth.ts (jose), sso-client.ts, mongodb.ts
models/   9 modèles Mongoose
middleware.ts   CORS vers l'origine RH
```

### 3.2 Capture SSO (`lib/sso-client.ts` + `components/SsoTokenCapture.tsx`)
- `captureSsoToken()` : lit `?token=` dans l'URL, le persiste en `localStorage('token')`,
  **nettoie l'URL** (`history.replaceState`) pour ne pas laisser fuiter le jeton.
- `redirectToLogin()` : renvoie vers `${RH_BASE_URL}/login?redirect=…` (le login reste côté RH).
- Aucune page de login propre au LMS.

### 3.3 Autorisation côté LMS (`lib/auth.ts`)
`getAuthUser` décode le Bearer avec `jose` et le **secret partagé**. Helpers `requireAuth`,
`requireRole(roles[])`, `requireInstructor` (flag `is_instructor` OU rôle `ADMIN`). Le type
`LMSUser` inclut `company_id` — **mais ce claim arrive `undefined`** depuis le RH (cf.
`api-analysis.md`), donc tout filtrage multi-tenant LMS basé dessus est inopérant.

---

## 4. Observations frontend (lecture seule)

1. **Fichiers parasites / doublons** :
   - `recruiter/jobs/create/` **et** `recruiter/jobs/new/` (deux pages de création d'offre).
   - `recruiter/candidates/1/page.tsx.tmp` (fichier temporaire `.tmp` commité).
   - `recruiter/candidates/1/` (dossier figé en dur) coexistant avec la route dynamique `[id]`.
2. **URLs en dur** : `API_BASE = http://localhost:8000` non configurable par variable d'env
   (alors que `LMS_BASE` l'est via `NEXT_PUBLIC_LMS_URL`). Bloque un déploiement multi-env.
3. **Monolithe `api.ts`** : 713 lignes mêlant client réseau + définitions de types ; pas de
   séparation par domaine ni de couche de gestion d'erreurs centralisée.
4. **Token en `localStorage`** des deux côtés (Zustand persist + LMS) : exposition XSS du JWT,
   et le jeton transite en clair dans l'URL lors du SSO (atténué par le nettoyage immédiat).
5. **Deux versions de Tailwind/Next** entre les deux apps → divergence d'outillage et de
   conventions (config v3 vs v4).
6. Le type `LMSUser.company_id` suggère une intention multi-tenant non aboutie côté LMS.
