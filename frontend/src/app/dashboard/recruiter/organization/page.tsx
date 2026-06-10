"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
    getOrgTree,
    OrgUnitTree,
    createOrgUnit,
    getEmployees,
    getInternalRoles,
    Employee,
    InternalRole,
    updateEmployee
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import {
    Users,
    Briefcase,
    TrendingUp,
    LogOut,
    ChevronRight,
    ChevronDown,
    Plus,
    Folder,
    Building2,
    Settings,
    UserPlus,
    Shield,
    Search,
    AlertCircle
} from "lucide-react"

export default function OrganizationPage() {
    const router = useRouter()
    const { user, token, logout } = useAuthStore()

    // Data states
    const [tree, setTree] = React.useState<OrgUnitTree[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [roles, setRoles] = React.useState<InternalRole[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    // UI states
    const [showAddModal, setShowAddModal] = React.useState(false)
    const [showAssignModal, setShowAssignModal] = React.useState(false)
    const [selectedParent, setSelectedParent] = React.useState<number | null>(null)
    const [selectedUnitForMember, setSelectedUnitForMember] = React.useState<number | null>(null)
    const [employeeSearch, setEmployeeSearch] = React.useState("")

    // Form states
    const [newName, setNewName] = React.useState("")
    const [newType, setNewType] = React.useState("Département")
    const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<number | string>("")
    const [selectedRoleId, setSelectedRoleId] = React.useState<number | string>("")

    const loadData = async () => {
        if (!token) return
        setError(null)
        try {
            const [treeData, empData, roleData] = await Promise.all([
                getOrgTree(token),
                getEmployees(token),
                getInternalRoles(token)
            ])
            setTree(treeData)
            setEmployees(empData)
            setRoles(roleData)
        } catch (err: any) {
            console.error("Fetch error:", err)
            setError("Erreur d'accès : Session expirée ou droits insuffisants.")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        if (!user || user.role !== "RECRUITER") {
            router.push("/login")
            return
        }
        loadData()
    }, [user, token, router])

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return
        try {
            await createOrgUnit({
                name: newName,
                unit_type: newType,
                parent_id: selectedParent,
                description: ""
            }, token)
            setNewName("")
            setShowAddModal(false)
            loadData()
        } catch (err) {
            alert("Erreur lors de la création")
        }
    }

    const handleAssignMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token || !selectedEmployeeId || !selectedUnitForMember) return
        try {
            await updateEmployee(Number(selectedEmployeeId), {
                org_unit_id: selectedUnitForMember,
                internal_role_id: selectedRoleId ? Number(selectedRoleId) : null
            }, token)
            setShowAssignModal(false)
            setSelectedEmployeeId("")
            setSelectedRoleId("")
            loadData()
        } catch (err) {
            alert("Erreur lors de l'assignation : Vérifiez vos droits d'administration.")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        )
    }

    const unassignedEmployees = employees.filter(e => !e.org_unit_id &&
        (e.first_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            e.last_name.toLowerCase().includes(employeeSearch.toLowerCase())))

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-secondary/5 border-r border-secondary/10 hidden lg:flex flex-col p-6 z-50">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center font-black text-primary text-sm">R</div>
                    <span className="font-extrabold tracking-tighter text-lg">RECRUITPRO</span>
                </div>

                <nav className="space-y-2 flex-1">
                    <button onClick={() => router.push("/dashboard/recruiter")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <TrendingUp className="w-4 h-4" /> Overview
                    </button>
                    <button onClick={() => router.push("/dashboard/recruiter/employees")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <Users className="w-4 h-4" /> Employés
                    </button>
                    <button onClick={() => router.push("/dashboard/recruiter/organization")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm bg-primary/10 text-primary border border-primary/20">
                        <Building2 className="w-4 h-4" /> Organisation
                    </button>
                    <button onClick={() => router.push("/")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <Briefcase className="w-4 h-4" /> Voir le Site
                    </button>
                </nav>

                <button onClick={() => { logout(); router.push("/") }} className="flex items-center gap-3 p-3 text-muted/60 hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-bold text-xs uppercase tracking-widest mt-auto">
                    <LogOut className="w-4 h-4" /> Déconnexion
                </button>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 p-6 md:p-12">
                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-bold">{error}</p>
                        <button onClick={() => { logout(); router.push("/login") }} className="ml-auto underline text-[10px] uppercase font-black">Se reconnecter</button>
                    </div>
                )}

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Structure & Talents</h1>
                        <p className="text-muted font-medium">Gérez votre organigramme et les accès RH de sécurité.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setSelectedParent(null); setShowAddModal(true) }}
                            className="btn-premium bg-primary text-primary-foreground py-2 text-xs flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Unité Parent
                        </button>
                        <ThemeToggle />
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Organigramme */}
                    <div className="xl:col-span-2 glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5">
                        <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-primary" /> Architecture Entreprise
                        </h2>
                        <div className="space-y-4">
                            {tree.length > 0 ? (
                                tree.map((unit) => (
                                    <OrgUnitRow
                                        key={unit.id}
                                        unit={unit}
                                        allEmployees={employees}
                                        onAddChild={(id) => { setSelectedParent(id); setShowAddModal(true) }}
                                        onAddMember={(id) => { setSelectedUnitForMember(id); setShowAssignModal(true) }}
                                    />
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <Building2 className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                                    <p className="text-muted font-bold">Aucune structure définie.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panneau Latéral : People Management */}
                    <div className="space-y-8">
                        {/* New People / Inbox */}
                        <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5 flex flex-col max-h-[500px]">
                            <h2 className="text-xl font-black mb-4 flex items-center gap-3">
                                <Users className="w-5 h-5 text-primary" /> À Assigner
                            </h2>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    type="text"
                                    placeholder="Chercher un collaborateur..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    className="w-full bg-secondary/5 border border-secondary/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                {unassignedEmployees.map(emp => (
                                    <div key={emp.id} className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10 flex items-center justify-between group hover:border-primary/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary text-xs uppercase">
                                                {emp.first_name[0]}{emp.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold truncate w-24">{emp.first_name} {emp.last_name}</p>
                                                <p className="text-[10px] font-black text-muted/50 uppercase truncate w-24">{emp.job_title}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedEmployeeId(emp.id); setShowAssignModal(true) }}
                                            className="p-2 rounded-lg bg-primary text-primary-foreground hover:scale-110 transition-all"
                                            title="Assigner à une équipe"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {unassignedEmployees.length === 0 && (
                                    <div className="text-center py-10 opacity-30">
                                        <Users className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase">Aucun profile en attente</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary of Roles */}
                        <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5 border-primary/10">
                            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                                <Shield className="w-5 h-5 text-primary" /> Rôles de Sécurité
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                {roles.map(role => (
                                    <div key={role.id} className="p-3 rounded-xl bg-secondary/5 border border-secondary/10 flex flex-col justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-tighter truncate">{role.name}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[8px] opacity-50">{role.permissions?.length || 0} perms</span>
                                            <Shield className="w-3 h-3 text-primary/40" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Add Unit */}
            {showAddModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel p-8 rounded-[3rem] w-full max-w-md shadow-2xl border-primary/20">
                        <h2 className="text-2xl font-black mb-6">Nouvelle Unité</h2>
                        <form onSubmit={handleAddUnit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Nom</label>
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="ex: Design Studio"
                                    className="w-full bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-all font-bold"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 font-black uppercase text-xs text-muted">Annuler</button>
                                <button type="submit" className="flex-1 btn-premium bg-primary text-primary-foreground py-3 text-xs">Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Assign Member */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel p-8 rounded-[3rem] w-full max-w-md shadow-2xl border-primary/20">
                        <h2 className="text-2xl font-black mb-6">Configuration RH</h2>
                        <form onSubmit={handleAssignMember} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Collaborateur</label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-all font-bold"
                                    required
                                >
                                    <option value="">Sélectionner...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.job_title})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Rôle de sécurité</label>
                                <select
                                    value={selectedRoleId}
                                    onChange={(e) => setSelectedRoleId(e.target.value)}
                                    className="w-full bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-all font-bold"
                                >
                                    <option value="">Rôle Standard (Employé)</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-3 font-black uppercase text-xs text-muted">Annuler</button>
                                <button type="submit" className="flex-1 btn-premium bg-primary text-primary-foreground py-3 text-xs">Confirmer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function OrgUnitRow({
    unit,
    level = 0,
    allEmployees,
    onAddChild,
    onAddMember
}: {
    unit: OrgUnitTree,
    level?: number,
    allEmployees: Employee[],
    onAddChild: (id: number) => void,
    onAddMember: (id: number) => void
}) {
    const [isExpanded, setIsExpanded] = React.useState(true)
    const hasChildren = unit.children && unit.children.length > 0
    const unitMembers = allEmployees.filter(e => e.org_unit_id === unit.id)

    return (
        <div className="space-y-4">
            <div
                className="group flex flex-col p-6 rounded-[2rem] bg-secondary/5 border border-secondary/10 hover:border-primary/30 transition-all"
                style={{ marginLeft: `${level * 40}px` }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`p-1 rounded-md hover:bg-secondary/10 transition-colors ${(!hasChildren && unitMembers.length === 0) && 'opacity-0 cursor-default'}`}
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${level === 0 ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10' : 'bg-secondary/20 text-muted'}`}>
                                {level === 0 ? <Building2 className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-black text-lg tracking-tight">{unit.name}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/50">{unit.unit_type}</p>
                                    <span className="w-1 h-1 rounded-full bg-muted/30" />
                                    <p className="text-[10px] font-black uppercase text-primary/60">{unitMembers.length} membres</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onAddMember(unit.id)}
                            className="p-2.5 rounded-xl bg-secondary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all"
                            title="Assigner un talent"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onAddChild(unit.id)}
                            className="p-2.5 rounded-xl bg-secondary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all"
                            title="Ajouter une sous-division"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {isExpanded && unitMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-secondary/5 mt-2">
                        {unitMembers.map(emp => (
                            <div key={emp.id} className="px-3 py-1.5 bg-secondary/10 border border-secondary/10 rounded-full flex items-center gap-2 group/member hover:border-primary/20 transition-all cursor-pointer">
                                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-black">
                                    {emp.first_name[0]}{emp.last_name[0]}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black leading-tight">{emp.first_name}</span>
                                    <span className="text-[7px] uppercase font-bold text-muted/60">{emp.job_title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isExpanded && hasChildren && (
                <div className="space-y-4">
                    {unit.children.map((child) => (
                        <OrgUnitRow
                            key={child.id}
                            unit={child}
                            level={level + 1}
                            allEmployees={allEmployees}
                            onAddChild={onAddChild}
                            onAddMember={onAddMember}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
