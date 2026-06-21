import { AuthUser } from "./auth-store"

const API_BASE = "http://localhost:8000"
const LMS_BASE = process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001"

// SSO unifiée: ouvre le service LMS (RecruitPRO Academy) en transmettant le
// token JWT RH via ?token=. Le LMS le capture et le persiste (cf. SsoTokenCapture).
export function lmsLaunchUrl(token: string, path = "/"): string {
  const sep = path.includes("?") ? "&" : "?"
  return `${LMS_BASE}${path}${sep}token=${encodeURIComponent(token)}`
}
export interface SkillRequirement {
  skill_id: number
  required_level: number
  is_mandatory: boolean
  skill_name?: string
}

export interface Job {
  id: number
  title: string
  description: string
  location: string
  company: string
  salary_min?: number
  salary_max?: number
  min_years_experience: number
  min_education_level: number
  recruiter_id?: number
  requirements: SkillRequirement[]
  matching_candidates: MatchResult[]
}

export type Recommendation = "STRONG_FIT" | "POTENTIAL" | "WEAK_FIT"

export interface MatchResult {
  candidate_id: number
  full_name: string
  score: number
  potential_score?: number | null
  recommendation?: Recommendation
  gaps: Gap[]
  has_applied: boolean
}

export interface Gap {
  type: string
  name?: string
  id?: number
  required: number
  actual: number
  category?: string | null
  bridgeable?: boolean
}

export interface MatchDetails {
  total_score: number
  skill_score: number
  experience_score: number
  education_score: number
  potential_score?: number | null
  recommendation?: Recommendation
  gaps: Gap[]
  detailed_skills: DetailedSkill[]
} 


export interface DetailedSkill {
  skill_name: string
  required: number
  actual: number
}

export interface CandidateSkill {
  skill_id: number
  name: string
  level: number
  years_experience: number
}

export interface CandidateProfile {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  years_of_experience?: number
  education_level?: number
  bio?: string
  cv_text?: string
  cv_url?: string
  formations?: string
  certifications?: string
  experience_detail?: string
  onboarding_step?: number
  is_active?: boolean
  is_visible?: boolean
  skills: CandidateSkill[]
  match_score?: number
  match_details?: MatchDetails
  application_id?: number
  current_status?: string
}

export interface Application {
  id: number
  candidate_id: number
  job_id: number
  status: string
  cover_letter?: string
  created_at: string
  job_title?: string
  candidate_name?: string
  match_details?: MatchDetails
  candidate_profile?: {
    bio?: string
    formations?: string
    certifications?: string
    experience_detail?: string
    years_of_experience?: number
    education_level?: number
    cv_text?: string
  }
}

export interface Skill {
  id: number
  name: string
  category?: string
  rome_code?: string
}

export interface EmployeeSkillEntry {
  id?: number
  skill_id: number
  name?: string
  level: number
  years_experience: number
  certified?: boolean
}

export interface Employee {
  id: number
  first_name: string
  last_name: string
  job_title?: string
  department?: string
  org_unit_id?: number | null
  internal_role_id?: number | null
  manager_id?: number | null
  email?: string
  phone?: string
  hire_date?: string
  years_of_experience?: number
  education_level?: number
  is_active?: number
  skills?: EmployeeSkillEntry[]
}

export interface InternalRole {
  id: number
  name: string
  permissions?: { id: number; name: string }[]
}

export interface OrgUnitTree {
  id: number
  name: string
  unit_type?: string
  description?: string
  parent_id?: number
  manager_id?: number
  children: OrgUnitTree[]
}


async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  
  if (token) headers["Authorization"] = `Bearer ${token}`
  
  // N'ajouter Content-Type: application/json que si non spécifié 
  // et si le corps n'est pas FormData ou URLSearchParams
  if (!headers["Content-Type"] && options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json"
  }
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const params = new URLSearchParams()
  params.append("username", email)
  params.append("password", password)
  
  const data = await apiFetch<{ access_token: string; token_type: string }>(
    "/api/auth/token",
    { 
      method: "POST", 
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" } 
    }
  )
  const user = await apiFetch<AuthUser>("/api/auth/me", {}, data.access_token)
  return { user, token: data.access_token }
}

export async function register(fullName: string, email: string, password: string, role: "CANDIDATE" | "RECRUITER"): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name: fullName, email, password, role }),
  })
}

export async function testConnection(): Promise<void> {
  try { await fetch(`${API_BASE}/`) } catch { console.warn("Backend non accessible") }
}

export async function getLatestJobs(limit = 6): Promise<Job[]> {
  const jobs = await apiFetch<Job[]>(`/api/jobs/?limit=${limit}`)
  return jobs.map((j) => ({ ...j, matching_candidates: j.matching_candidates ?? [] }))
}

export async function getJob(jobId: number): Promise<Job> {
  const job = await apiFetch<Job>(`/api/jobs/${jobId}`)
  return { ...job, matching_candidates: job.matching_candidates ?? [] }
}

export async function getRecruiterJobsWithMatches(token: string): Promise<Job[]> {
  const jobs = await apiFetch<Job[]>("/api/jobs/", {}, token)
  const enriched = await Promise.all(
    jobs.map(async (job) => {
      try {
        const data = await apiFetch<Job & { matching_candidates: MatchResult[] }>(`/api/jobs/${job.id}/matches`, {}, token)
        return { ...job, matching_candidates: data.matching_candidates ?? [] }
      } catch {
        return { ...job, matching_candidates: [] }
      }
    })
  )
  return enriched
}

export interface InternalMatch {
  employee_id: number
  full_name: string
  job_title?: string
  total_score: number
  trainable: boolean
  gaps: { type: string; skill_name?: string; id?: number; required: number; actual: number }[]
}

export async function getInternalMatches(jobId: number, token: string): Promise<InternalMatch[]> {
  return apiFetch<InternalMatch[]>(`/api/jobs/${jobId}/internal-matches`, {}, token)
}


export async function getJobApplications(jobId: number, token: string): Promise<Application[]> {
  return apiFetch<Application[]>(`/api/applications/job/${jobId}/`, {}, token)
}

export async function getMyApplications(token: string): Promise<Application[]> {
  return apiFetch<Application[]>("/api/applications/me", {}, token)
}

export async function updateApplicationStatus(appId: number, newStatus: string, token: string): Promise<Application> {
  return apiFetch<Application>(`/api/applications/${appId}/status/`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }, token)
}

export async function inviteCandidate(jobId: number, candidateId: number, token: string): Promise<Application> {
  return apiFetch<Application>("/api/applications/invite", { method: "POST", body: JSON.stringify({ job_id: jobId, candidate_id: candidateId }) }, token)
}

export async function applyToJob(jobId: number, coverLetter: string | undefined, token: string): Promise<Application> {
  return apiFetch<Application>("/api/applications/", { method: "POST", body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter }) }, token)
}


export async function getMyProfile(token: string): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/api/candidates/me/", {}, token)
}

export interface ProfileDomainSuggestion {
  label: string
  fit_level: "fort" | "potentiel" | "à découvrir"
  owned_skills: { name: string; level: number }[]
  suggested_skills: string[]
  owned_count: number
  typical_count: number
}

export interface ProfileAnalysis {
  domains: ProfileDomainSuggestion[]
  has_rome_data: boolean
}

export async function getProfileAnalysis(token: string): Promise<ProfileAnalysis> {
  return apiFetch<ProfileAnalysis>("/api/candidates/me/profile-analysis", {}, token)
}

export async function updateMyProfile(profile: Partial<CandidateProfile>, token: string): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/api/candidates/me/", { method: "PUT", body: JSON.stringify(profile) }, token)
}

export async function updateCandidateOnboarding(data: Partial<CandidateProfile>, token: string): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/api/candidates/me/onboarding/", { method: "PATCH", body: JSON.stringify(data) }, token)
}

export async function getCandidate(candidateId: number, token: string, jobId?: number): Promise<CandidateProfile> {
  const candidate = await apiFetch<CandidateProfile>(`/api/candidates/${candidateId}/`, {}, token)
  if (jobId) {
    try {
      const apps = await apiFetch<Application[]>(`/api/applications/job/${jobId}/`, {}, token)
      const app = apps.find((a) => a.candidate_id === candidateId)
      if (app) {
        candidate.application_id = app.id
        candidate.current_status = app.status
        candidate.match_score = app.match_details?.total_score
        candidate.match_details = app.match_details
      }
    } catch {}
  }
  return candidate
}

export async function uploadCV(file: File, token: string): Promise<CandidateProfile> {
  const form = new FormData()
  form.append("file", file)
  return apiFetch<CandidateProfile>("/api/candidates/me/cv/", {
    method: "POST",
    body: form,
  }, token)
}

export async function getSkills(token?: string): Promise<Skill[]> {
  return apiFetch<Skill[]>("/api/skills/", {}, token)
}

export async function searchSkills(query: string, token?: string): Promise<Skill[]> {
  const all = await apiFetch<Skill[]>(`/api/skills/?limit=200`, {}, token)
  return all.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
}


export interface JobStandardSuggestion {
  id: number
  title: string
  rome_code: string
  category: string
  description: string
  suggested_skills: {
    skill_id: number
    skill_name: string
    rome_code: string | null
    min_level: number
    is_mandatory: boolean
  }[]
}

export async function suggestJobStandards(q: string, token: string): Promise<JobStandardSuggestion[]> {
  return apiFetch<JobStandardSuggestion[]>(`/api/jobs/standards/suggest?q=${encodeURIComponent(q)}&limit=5`, {}, token)
}

export async function createJob(data: {
  title: string
  description: string
  location: string
  company: string
  min_years_experience: number
  min_education_level: number
  salary_min?: number
  salary_max?: number
  contract_type?: string
  start_date?: string
  benefits?: string[]
  requirements: { skill_id: number; required_level: number; is_mandatory: boolean }[]
}, token: string): Promise<Job> {
  return apiFetch<Job>("/api/jobs/", { method: "POST", body: JSON.stringify(data) }, token)
}

export async function getOrgTree(token: string): Promise<OrgUnitTree[]> {
  return apiFetch<OrgUnitTree[]>("/api/organization/tree", {}, token)
}

export async function createOrgUnit(data: { name: string; unit_type?: string; parent_id?: number | null; description?: string }, token: string): Promise<OrgUnitTree> {
  return apiFetch<OrgUnitTree>("/api/organization/", { method: "POST", body: JSON.stringify(data) }, token)
}

export async function getEmployees(token: string): Promise<Employee[]> {
  return apiFetch<Employee[]>("/api/employees/", {}, token)
}

export async function createEmployee(
  data: Omit<Employee, "id"> & { skills?: { skill_id: number; level: number; years_experience: number }[] },
  token: string
): Promise<Employee> {
  return apiFetch<Employee>("/api/employees/", { method: "POST", body: JSON.stringify(data) }, token)
}

export async function updateEmployee(employeeId: number, data: Partial<Employee>, token: string): Promise<Employee> {
  return apiFetch<Employee>(`/api/employees/${employeeId}`, { method: "PUT", body: JSON.stringify(data) }, token)
}


export async function deleteEmployee(employeeId: number, token: string): Promise<void> {
  return apiFetch<void>(`/api/employees/${employeeId}`, { method: "DELETE" }, token)
}

export async function getEmployee(employeeId: number, token: string): Promise<Employee> {
  return apiFetch<Employee>(`/api/employees/${employeeId}`, {}, token)
}

export async function getInternalRoles(token: string): Promise<InternalRole[]> {
  return apiFetch<InternalRole[]>("/api/roles/", {}, token)
}


export async function confirmHire(
  appId: number,
  jobTitle: string,
  token: string
): Promise<void> {
  return apiFetch<void>(
    `/api/applications/${appId}/hire`,
    { method: "POST", body: JSON.stringify({ job_title: jobTitle }) },
    token
  )
}



// ─── LMS ─────────────────────────────────────────────────────────────────────

export interface LMSCourse {
  _id: string
  title: string
  description: string
  thumbnail?: string
  skillId?: number
  skillLevel?: number
  status: "draft" | "published"
  categoryId?: string
  finalExam?: string
  modules?: { _id: string; title: string; order: number }[]
}

export interface LMSEnrollment {
  _id: string
  employeeId: number
  courseId: LMSCourse
  status: "assigned" | "in_progress" | "completed" | "abandoned"
  assignedAt: string
  startedAt?: string
  completedAt?: string
  finalScore?: number
  progress?: {
    completedSections: number
    completedModules: number
    quizResults: { quizId: string; score: number; passed: boolean; completedAt: string }[]
  }
}






// Active/désactive le statut formateur (is_instructor) d'un utilisateur (ADMIN/RH).
export async function setInstructor(
  userId: number,
  token: string
): Promise<{ id: number; is_instructor: boolean }> {
  return apiFetch<{ id: number; is_instructor: boolean }>(
    `/api/users/${userId}/set-instructor`,
    { method: "PATCH" },
    token
  )
}

// ─── GPEC (BF-18) ─────────────────────────────────────────────────────────────
export interface GpecDomain {
  label: string
  employees: number
  skill_entries: number
  avg_level: number
}
export interface GpecCoverage {
  skill_id: number
  skill: string
  domain: string
  required_level: number
  is_mandatory: boolean
  employees_with: number
  employees_at_level: number
  avg_level: number
  status: "critique" | "partiel" | "ok"
  reason: string
  jobs_impacted: number
  teams_impacted: number
  job_titles: string[]
}
export interface GpecOverview {
  headcount: number
  distinct_skills: number
  open_positions: number
  domains: GpecDomain[]
  coverage: GpecCoverage[]
  tension_count: number
  covered_count: number
  required_count: number
  coverage_index: number
  coverage_target: number
}
export async function getGpecOverview(token: string): Promise<GpecOverview> {
  return apiFetch<GpecOverview>("/api/gpec/overview", {}, token)
}

export interface GpecGapEmployee {
  user_id: number
  name: string
  job_title?: string | null
  current_level: number
}
export interface GpecSkillGap {
  skill_id: number
  skill: string
  required_level: number
  employees: GpecGapEmployee[]
}
// Employés de l'entreprise sous le niveau requis pour une compétence (à former).
export async function getGpecSkillGap(skillId: number, token: string): Promise<GpecSkillGap> {
  return apiFetch<GpecSkillGap>(`/api/gpec/skill/${skillId}/gap`, {}, token)
}
// Cours LMS (publiés) qui valident une compétence RH donnée.
export async function getCoursesForSkill(skillId: number, token: string): Promise<LMSCourse[]> {
  const data = await lmsFetch<any>(`/api/courses?skillId=${skillId}&limit=50`, {}, token)
  const list = Array.isArray(data) ? data : (data?.courses ?? [])
  return list.filter((c: LMSCourse) => c.status === "published")
}

// ─── GPEC prévisionnelle (cibles d'effectif vs emplois-types) ────────────────
export interface ForecastEmployee {
  employee_id: number
  name: string
  job_title?: string | null
  skill_score: number
  potential_score: number | null
}
export interface ForecastEmergentSkill {
  skill: string
  required_level: number
  holders_at_level: number
}
export interface ForecastRole {
  target_id: number
  role: string
  rome_code?: string | null
  org_unit_id?: number | null
  horizon?: string | null
  priority: number
  target_headcount: number
  qualified_count: number
  potential_count: number
  gap: number
  coverage_pct: number
  status: "critique" | "partiel" | "couvert"
  qualified: ForecastEmployee[]
  potentials: ForecastEmployee[]
  emergent_skills: ForecastEmergentSkill[]
}
export interface ForecastOverview {
  headcount: number
  targets_count: number
  total_target_headcount: number
  total_qualified: number
  total_gap: number
  coverage_index: number
  coverage_target: number
  tension_count: number
  roles: ForecastRole[]
}
export interface ForecastSynthesis {
  synthesis: string
  source: "groq" | "fallback"
  coverage_index: number
  tension_count: number
}
export async function getGpecForecast(token: string): Promise<ForecastOverview> {
  return apiFetch<ForecastOverview>("/api/gpec/forecast", {}, token)
}
export async function getGpecForecastSynthesis(token: string): Promise<ForecastSynthesis> {
  return apiFetch<ForecastSynthesis>("/api/gpec/forecast/synthesis", {}, token)
}

// Vivier interne d'une cible : qualifiés + potentiels (avec compétences à développer)
export interface PoolDevelop { skill: string; required: number; actual: number; mandatory: boolean }
export interface PoolPerson {
  employee_id: number
  name: string
  job_title?: string | null
  skill_score: number
  potential_score: number | null
  to_develop: PoolDevelop[]
}
export interface TargetPool {
  target_id: number
  role: string
  rome_code?: string | null
  horizon?: string | null
  target_headcount: number
  qualified: PoolPerson[]
  potentials: PoolPerson[]
}
export async function getGpecTargetPool(targetId: number, token: string): Promise<TargetPool> {
  return apiFetch<TargetPool>(`/api/gpec/targets/${targetId}/pool`, {}, token)
}

// Explication LLM de la mobilité d'un collaborateur vers une cible
export interface MobilityAssessment {
  employee_id: number
  name: string
  job_title?: string | null
  role: string
  qualified: boolean
  potential_score: number | null
  have: PoolDevelop[] | { skill: string; level: number }[]
  to_develop: PoolDevelop[]
  explanation: string
  source: "groq" | "fallback"
}
export async function getGpecMobility(targetId: number, employeeId: number, token: string): Promise<MobilityAssessment> {
  return apiFetch<MobilityAssessment>(`/api/gpec/targets/${targetId}/mobility/${employeeId}`, {}, token)
}

// ─── LMS ─────────────────────────────────────────────────────────────────────
// Le LMS est un service séparé (port 3001). On l'appelle directement avec le
// token JWT RH (SSO unifiée). Helper dédié car base URL ≠ API_BASE.

async function lmsFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (!headers["Content-Type"] && options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(`${LMS_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function getLMSCourses(token: string): Promise<LMSCourse[]> {
  const data = await lmsFetch<any>("/api/courses?limit=100", {}, token)
  return Array.isArray(data) ? data : (data?.courses ?? [])
}

export async function getEmployeeEnrollments(employeeId: number, token: string): Promise<LMSEnrollment[]> {
  const data = await lmsFetch<any>(`/api/enrollments?employeeId=${employeeId}`, {}, token)
  return Array.isArray(data) ? data : (data?.enrollments ?? [])
}

// Inscriptions LMS de l'employé connecté (cours assignés via le LMS).
// Lue par la page "Mes Formations" pour unifier les deux systèmes de formation.
export async function getMyLmsEnrollments(token: string): Promise<LMSEnrollment[]> {
  const data = await lmsFetch<any>(`/api/enrollments/me`, {}, token)
  return Array.isArray(data) ? data : (data?.enrollments ?? [])
}

export async function assignCourse(
  employeeId: number,
  courseId: string,
  token: string
): Promise<LMSEnrollment> {
  const data = await lmsFetch<any>(
    `/api/enrollments`,
    { method: "POST", body: JSON.stringify({ employeeId, courseId }) },
    token
  )
  return data?.enrollment ?? data
}


// ─── Employee Dashboard ───────────────────────────────────────────────────────

export interface EmployeeProfile {
  id: number
  first_name: string
  last_name: string
  email?: string
  phone?: string
  job_title?: string
  org_unit_id?: number
  internal_role_id?: number
  manager_id?: number
  years_of_experience: number
  education_level: number
  hire_date?: string
  skills: Array<{
    skill_id: number
    level: number
    years_experience: number
    certified: number
  }>
}

export interface UserPermissions {
  permissions: string[]
  internal_role?: {
    id: number
    name: string
    description?: string
  }
}

export async function getEmployeeMe(token: string): Promise<EmployeeProfile> {
  return apiFetch<EmployeeProfile>(
    `/api/employees/me`,
    {},
    token
  )
}

export async function getUserPermissions(token: string): Promise<UserPermissions> {
  return apiFetch<UserPermissions>(
    `/api/users/me/permissions`,
    {},
    token
  )
}


// ─── Internal Mobility ───────────────────────────────────────────────────────

export interface InternalPositionRequirement {
  skill_id: number
  skill_name?: string
  required_level: number
  is_mandatory: boolean
}

export interface InternalPosition {
  id: number
  title: string
  description?: string
  department?: string
  location?: string
  salary_min?: number
  salary_max?: number
  status: "OPEN" | "CLOSED" | "FILLED"
  posted_by?: number
  posted_at: string
  requirements: InternalPositionRequirement[]
}

export interface InternalApplication {
  id: number
  position_id: number
  employee_id: number
  status: "PENDING" | "REVIEWING" | "INTERVIEW" | "ACCEPTED" | "REJECTED"
  motivation_letter?: string
  applied_at: string
  updated_at: string
  position?: InternalPosition
}

export async function getInternalPositions(
  token: string,
  status?: string
): Promise<InternalPosition[]> {
  const url = `/internal-mobility/positions${status ? `?status=${status}` : ""}`
  return apiFetch<InternalPosition[]>(url, {}, token)
}

export async function getInternalPosition(
  positionId: number,
  token: string
): Promise<InternalPosition> {
  return apiFetch<InternalPosition>(
    `/internal-mobility/positions/${positionId}`,
    {},
    token
  )
}

export async function getMyInternalApplications(
  token: string,
  status?: string
): Promise<InternalApplication[]> {
  const url = `/internal-mobility/my-applications${status ? `?status=${status}` : ""}`
  return apiFetch<InternalApplication[]>(url, {}, token)
}

export async function applyToPosition(
  positionId: number,
  motivationLetter?: string,
  token?: string
): Promise<InternalApplication> {
  return apiFetch<InternalApplication>(
    `/internal-mobility/applications`,
    {
      method: "POST",
      body: JSON.stringify({ position_id: positionId, motivation_letter: motivationLetter })
    },
    token
  )
}


// ─── Trainings ───────────────────────────────────────────────────────────────

export interface TrainingSkill {
  skill_id: number
  skill_name?: string
  level_gained: number
}

export interface Training {
  id: number
  title: string
  description?: string
  category: string
  duration_hours?: number
  provider?: string
  cost?: number
  max_participants?: number
  is_active: number
  created_at: string
  skills_taught: TrainingSkill[]
}

export interface TrainingEnrollment {
  id: number
  employee_id: number
  training_id: number
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED"
  enrolled_at: string
  completed_at?: string
  score?: number
  feedback?: string
  training?: Training
}

export async function getTrainingsCatalog(
  token: string,
  category?: string
): Promise<Training[]> {
  const url = `/trainings/catalog${category ? `?category=${category}` : ""}`
  return apiFetch<Training[]>(url, {}, token)
}

export async function getMyTrainingEnrollments(
  token: string,
  status?: string
): Promise<TrainingEnrollment[]> {
  const url = `/trainings/my-enrollments${status ? `?status=${status}` : ""}`
  return apiFetch<TrainingEnrollment[]>(url, {}, token)
}

export async function getTraining(
  trainingId: number,
  token: string
): Promise<Training> {
  return apiFetch<Training>(
    `/trainings/${trainingId}`,
    {},
    token
  )
}







