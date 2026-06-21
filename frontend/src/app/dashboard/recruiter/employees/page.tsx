"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getInternalRoles,
  getOrgTree,
  Employee,
  InternalRole,
  OrgUnitTree,
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { Toast, useToast } from "@/components/toast"
import { useDialog } from "@/lib/use-dialog"
import {
  Users,
  Briefcase,
  TrendingUp,
  LogOut,
  Plus,
  Building2,
  Search,
  Edit2,
  Trash2,
  X,
  UserPlus,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"

const EDUCATION_LABELS: Record<number, string> = {
  0: "Non précisé",
  1: "Bac",
  2: "Bac+2",
  3: "Bac+3",
  4: "Bac+5",
  5: "Doctorat",
}

function flattenTree(units: OrgUnitTree[]): OrgUnitTree[] {
  const result: OrgUnitTree[] = []
  function walk(u: OrgUnitTree) {
    result.push(u)
    u.children?.forEach(walk)
  }
  units.forEach(walk)
  return result
}

type ModalMode = "create" | "edit" | null

export default function EmployeesPage() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()

  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [roles, setRoles] = React.useState<InternalRole[]>([])
  const [orgUnits, setOrgUnits] = React.useState<OrgUnitTree[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterUnit, setFilterUnit] = React.useState<string>("all")

  const [modalMode, setModalMode] = React.useState<ModalMode>(null)
  const [editTarget, setEditTarget] = React.useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Employee | null>(null)
  const [saving, setSaving] = React.useState(false)
  const { toast, showToast } = useToast()
  const modalRef = useDialog<HTMLDivElement>(modalMode !== null, () => setModalMode(null))
  const deleteRef = useDialog<HTMLDivElement>(deleteTarget !== null, () => setDeleteTarget(null))

  // Form state
  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    years_of_experience: 0,
    education_level: 0,
    org_unit_id: "" as number | string,
    internal_role_id: "" as number | string,
  })

  const loadData = async () => {
    if (!token) return
    try {
      const [emps, roleList, tree] = await Promise.all([
        getEmployees(token),
        getInternalRoles(token),
        getOrgTree(token),
      ])
      setEmployees(emps)
      setRoles(roleList)
      setOrgUnits(flattenTree(tree))
    } catch (e: any) {
      showToast("error", "Erreur de chargement: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!user || user.role !== "RECRUITER") { router.push("/login"); return }
    loadData()
  }, [user, token])

  const openCreate = () => {
    setForm({ first_name: "", last_name: "", email: "", phone: "", job_title: "", years_of_experience: 0, education_level: 0, org_unit_id: "", internal_role_id: "" })
    setEditTarget(null)
    setModalMode("create")
  }

  const openEdit = (emp: Employee) => {
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email || "",
      phone: emp.phone || "",
      job_title: emp.job_title || "",
      years_of_experience: emp.years_of_experience || 0,
      education_level: emp.education_level || 0,
      org_unit_id: emp.org_unit_id ?? "",
      internal_role_id: emp.internal_role_id ?? "",
    })
    setEditTarget(emp)
    setModalMode("edit")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        org_unit_id: form.org_unit_id !== "" ? Number(form.org_unit_id) : null,
        internal_role_id: form.internal_role_id !== "" ? Number(form.internal_role_id) : null,
      }
      if (modalMode === "create") {
        await createEmployee(payload as any, token)
        showToast("success", "Employé créé avec succès")
      } else if (editTarget) {
        await updateEmployee(editTarget.id, payload as any, token)
        showToast("success", "Employé mis à jour")
      }
      setModalMode(null)
      loadData()
    } catch (e: any) {
      showToast("error", e.message || "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !deleteTarget) return
    setSaving(true)
    try {
      await deleteEmployee(deleteTarget.id, token)
      showToast("success", "Employé supprimé")
      setDeleteTarget(null)
      loadData()
    } catch (e: any) {
      showToast("error", e.message || "Erreur lors de la suppression")
    } finally {
      setSaving(false)
    }
  }

  const filtered = employees.filter(emp => {
    const name = `${emp.first_name} ${emp.last_name}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase()) || (emp.job_title || "").toLowerCase().includes(search.toLowerCase())
    const matchUnit = filterUnit === "all" || String(emp.org_unit_id) === filterUnit
    return matchSearch && matchUnit
  })

  const getUnitName = (unitId?: number | null) => {
    if (!unitId) return null
    return orgUnits.find(u => u.id === unitId)?.name
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Chargement des employés…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <RecruiterSidebar active="employees" />

      {/* Main */}
      <main className="lg:ml-64 p-6 md:p-12">
        {/* Toast */}
        <Toast toast={toast} />

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Gestion des Employés</h1>
            <p className="text-muted font-medium">{employees.length} collaborateur{employees.length !== 1 ? "s" : ""} dans votre entreprise</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={openCreate} className="btn-premium bg-primary text-primary-foreground py-2.5 text-xs flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Nouvel Employé
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total", value: employees.length, color: "text-primary" },
            { label: "Assignés", value: employees.filter(e => e.org_unit_id).length, color: "text-green-500" },
            { label: "Non assignés", value: employees.filter(e => !e.org_unit_id).length, color: "text-amber-500" },
            { label: "Unités", value: orgUnits.length, color: "text-violet-500" },
          ].map(s => (
            <div key={s.label} className="glass-panel p-6 rounded-panel-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              placeholder="Chercher par nom, poste..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all font-medium"
            />
          </div>
          <div className="relative">
            <select
              value={filterUnit}
              onChange={e => setFilterUnit(e.target.value)}
              className="appearance-none bg-secondary/5 border border-secondary/10 rounded-2xl pl-4 pr-10 py-3 text-sm outline-none focus:border-primary/50 transition-all font-bold"
            >
              <option value="all">Toutes les unités</option>
              <option value="null">Non assigné</option>
              {orgUnits.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Employee Table */}
        <div className="glass-panel rounded-panel overflow-hidden shadow-xl shadow-black/5">
          {filtered.length === 0 ? (
            <div className="py-24 text-center max-w-sm mx-auto px-6">
              <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              {employees.length === 0 ? (
                <>
                  <p className="text-foreground font-bold mb-1">Aucun employé pour le moment</p>
                  <p className="text-muted text-sm mb-6">Ajoutez votre premier collaborateur pour commencer à structurer votre organisation.</p>
                  <button onClick={openCreate} className="btn-premium bg-primary text-primary-foreground py-2.5 px-6 text-xs inline-flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Nouvel Employé
                  </button>
                </>
              ) : (
                <>
                  <p className="text-foreground font-bold mb-1">Aucun résultat</p>
                  <p className="text-muted text-sm">Aucun employé ne correspond à votre recherche ou au filtre sélectionné.</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary/10">
                    <th className="text-left px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted">Collaborateur</th>
                    <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-muted hidden md:table-cell">Poste</th>
                    <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-muted hidden lg:table-cell">Unité</th>
                    <th className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-muted hidden xl:table-cell">Embauche</th>
                    <th className="text-right px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary/5">
                  {filtered.map(emp => (
                    <tr key={emp.id} className="hover:bg-secondary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm uppercase shrink-0">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{emp.first_name} {emp.last_name}</p>
                            <p className="text-[10px] text-muted font-medium flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <p className="text-sm font-bold">{emp.job_title}</p>
                        <p className="text-[10px] text-muted">{emp.years_of_experience}ans exp · {EDUCATION_LABELS[emp.education_level || 0]}</p>
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {getUnitName(emp.org_unit_id) ? (
                          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">
                            {getUnitName(emp.org_unit_id)}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-full uppercase">
                            Non assigné
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 hidden xl:table-cell">
                        <p className="text-xs text-muted font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString("fr-FR") : "—"}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-2 rounded-xl bg-secondary/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="Modifier"
                            aria-label={`Modifier ${emp.first_name} ${emp.last_name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="p-2 rounded-xl bg-secondary/10 hover:bg-red-500 hover:text-white transition-colors"
                            title="Supprimer"
                            aria-label={`Supprimer ${emp.first_name} ${emp.last_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div ref={modalRef} role="dialog" aria-modal="true" aria-label={modalMode === "create" ? "Nouvel employé" : "Modifier l'employé"} tabIndex={-1} className="glass-panel p-8 rounded-panel-lg w-full max-w-xl shadow-2xl border-primary/20 my-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">
                {modalMode === "create" ? "Nouvel Employé" : "Modifier l'Employé"}
              </h2>
              <button onClick={() => setModalMode(null)} className="p-2 rounded-xl hover:bg-secondary/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs">Prénom</label>
                  <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="input-field w-full" placeholder="Jean" />
                </div>
                <div>
                  <label className="label-xs">Nom</label>
                  <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="input-field w-full" placeholder="Dupont" />
                </div>
              </div>

              <div>
                <label className="label-xs">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field w-full" placeholder="jean.dupont@entreprise.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs">Téléphone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="input-field w-full" placeholder="+33 6 00 00 00 00" />
                </div>
                <div>
                  <label className="label-xs">Poste / Titre</label>
                  <input required value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                    className="input-field w-full" placeholder="Développeur Frontend" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs">Années d'expérience</label>
                  <input type="number" min={0} max={50} value={form.years_of_experience}
                    onChange={e => setForm(f => ({ ...f, years_of_experience: Number(e.target.value) }))}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="label-xs">Niveau d'études</label>
                  <select value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: Number(e.target.value) }))}
                    className="input-field w-full">
                    {Object.entries(EDUCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs">Unité organisationnelle</label>
                  <select value={form.org_unit_id} onChange={e => setForm(f => ({ ...f, org_unit_id: e.target.value }))}
                    className="input-field w-full">
                    <option value="">Non assigné</option>
                    {orgUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs">Rôle de sécurité</label>
                  <select value={form.internal_role_id} onChange={e => setForm(f => ({ ...f, internal_role_id: e.target.value }))}
                    className="input-field w-full">
                    <option value="">Standard (Employé)</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalMode(null)}
                  className="flex-1 py-3 font-bold uppercase text-xs text-muted hover:text-foreground transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-premium bg-primary text-primary-foreground py-3 text-xs disabled:opacity-50">
                  {saving ? "Enregistrement..." : modalMode === "create" ? "Créer l'Employé" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div ref={deleteRef} role="dialog" aria-modal="true" aria-label="Confirmer la suppression" tabIndex={-1} className="glass-panel p-8 rounded-panel-lg w-full max-w-sm shadow-2xl border-red-500/20">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-center mb-2">Supprimer l'employé ?</h2>
            <p className="text-sm text-muted text-center mb-8">
              <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong> sera définitivement supprimé du système.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 font-bold uppercase text-xs text-muted">Annuler</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-3 font-bold uppercase text-xs bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-50">
                {saving ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
