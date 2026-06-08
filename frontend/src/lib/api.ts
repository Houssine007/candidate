import { AuthUser } from "./auth-store"

const API_BASE = "http://localhost:8000"

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

export interface MatchResult {
  candidate_id: number
  full_name: string
  score: number
  gaps: Gap[]
  has_applied: boolean
}

export interface Gap {
  type: string
  name?: string
  required: number
  actual: number
}

export interface MatchDetails {
  total_score: number
  skill_score: number
  experience_score: number
  education_score: number
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

export interface Employee {
  id: number
  first_name: string
  last_name: string
  job_title?: string
  department?: string
  org_unit_id?: number | null
  internal_role_id?: number | null
  email?: string
  phone?: string
  hire_date?: string
  years_of_experience?: number
  education_level?: number
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

export async function createJob(job: Partial<Job>, token: string): Promise<Job> {
  return apiFetch<Job>("/api/jobs/", { method: "POST", body: JSON.stringify(job) }, token)
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

export async function getOrgTree(token: string): Promise<OrgUnitTree[]> {
  return apiFetch<OrgUnitTree[]>("/api/organization/tree", {}, token)
}

export async function createOrgUnit(data: { name: string; unit_type?: string; parent_id?: number | null; description?: string }, token: string): Promise<OrgUnitTree> {
  return apiFetch<OrgUnitTree>("/api/organization/", { method: "POST", body: JSON.stringify(data) }, token)
}

export async function getEmployees(token: string): Promise<Employee[]> {
  return apiFetch<Employee[]>("/api/employees/", {}, token)
}

export async function updateEmployee(employeeId: number, data: Partial<Employee>, token: string): Promise<Employee> {
  return apiFetch<Employee>(`/api/employees/${employeeId}`, { method: "PUT", body: JSON.stringify(data) }, token)
}

export async function getInternalRoles(token: string): Promise<InternalRole[]> {
  return apiFetch<InternalRole[]>("/api/roles/", {}, token)
}