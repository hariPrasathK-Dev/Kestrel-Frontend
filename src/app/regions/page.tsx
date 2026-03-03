"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { toast } from "react-toastify";

interface Region {
    _id: string;
    name: string;
    state: string;
    district: string;
    area: number;
    ecosystemType: string;
    protectionStatus: string;
    description: string;
    createdBy?: { name: string };
    createdAt: string;
}

const ECOSYSTEM_TYPES = ["Forest", "Wetland", "Grassland", "Coastal", "Desert", "Alpine", "Freshwater", "Other"];
const PROTECTION_STATUSES = ["Protected", "Unprotected", "Partial"];

const statusColor: Record<string, string> = {
    Protected: "#16a34a",
    Unprotected: "#dc2626",
    Partial: "#ca8a04",
};

const ecosystemIcon: Record<string, string> = {
    Forest: "🌲", Wetland: "🌿", Grassland: "🌾", Coastal: "🌊",
    Desert: "🏜️", Alpine: "🏔️", Freshwater: "💧", Other: "🗺️",
};

const emptyForm = { name: "", state: "", district: "", area: "", ecosystemType: "Forest", protectionStatus: "Unprotected", description: "" };

export default function RegionsPage() {
    const { user } = useAuth();
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editRegion, setEditRegion] = useState<Region | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [ecoFilter, setEcoFilter] = useState("");

    const canManage = user?.role === "officer" || user?.role === "admin";
    const canDelete = user?.role === "admin";

    const loadRegions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (ecoFilter) params.set("ecosystemType", ecoFilter);
            const res = await api.get(`/regions?${params.toString()}`);
            setRegions(res.data.regions);
        } catch {
            toast.error("Failed to load regions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRegions(); }, [search, ecoFilter]);

    const openCreate = () => { setForm(emptyForm); setEditRegion(null); setShowForm(true); };
    const openEdit = (r: Region) => {
        setForm({ name: r.name, state: r.state, district: r.district, area: String(r.area), ecosystemType: r.ecosystemType, protectionStatus: r.protectionStatus, description: r.description });
        setEditRegion(r);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.state.trim()) return toast.error("Name and state are required");
        setSaving(true);
        try {
            const payload = { ...form, area: Number(form.area) || 0 };
            if (editRegion) {
                await api.put(`/regions/${editRegion._id}`, payload);
                toast.success("Region updated");
            } else {
                await api.post("/regions", payload);
                toast.success("Region created");
            }
            setShowForm(false);
            loadRegions();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save region");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this region?")) return;
        try {
            await api.delete(`/regions/${id}`);
            toast.success("Region deleted");
            loadRegions();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Delete failed");
        }
    };

    return (
        <ProtectedRoute>
            <div className="app-shell">
                <Sidebar />
                <div className="main-content">
                    <div className="topbar">
                        <div>
                            <div className="topbar-title">Regions</div>
                            <div className="topbar-subtitle">Master list of geographic monitoring regions</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                                className="form-input"
                                placeholder="Search regions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ fontSize: 13, padding: "6px 10px", minWidth: 180 }}
                            />
                            <select
                                className="form-select"
                                value={ecoFilter}
                                onChange={(e) => setEcoFilter(e.target.value)}
                                style={{ fontSize: 13, padding: "6px 10px" }}
                            >
                                <option value="">All Ecosystems</option>
                                {ECOSYSTEM_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                            {canManage && (
                                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                                    + Add Region
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="page-wrapper">
                        {/* Form Card */}
                        {showForm && canManage && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-header">
                                    <span className="card-title">{editRegion ? "Edit Region" : "Add New Region"}</span>
                                    <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(false)}>✕</button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="grid-2" style={{ marginBottom: 12 }}>
                                        <div className="form-group">
                                            <label className="form-label">Region Name *</label>
                                            <input className="form-input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nilgiri Biosphere" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">State *</label>
                                            <input className="form-input" value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. Tamil Nadu" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">District</label>
                                            <input className="form-input" value={form.district} onChange={(e) => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Nilgiris" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Area (sq km)</label>
                                            <input className="form-input" type="number" value={form.area} onChange={(e) => setForm(f => ({ ...f, area: e.target.value }))} placeholder="0" min="0" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Ecosystem Type</label>
                                            <select className="form-select" value={form.ecosystemType} onChange={(e) => setForm(f => ({ ...f, ecosystemType: e.target.value }))}>
                                                {ECOSYSTEM_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Protection Status</label>
                                            <select className="form-select" value={form.protectionStatus} onChange={(e) => setForm(f => ({ ...f, protectionStatus: e.target.value }))}>
                                                {PROTECTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-textarea" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this region..." style={{ minHeight: 72 }} />
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : editRegion ? "Update Region" : "Create Region"}</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Table */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Regions ({regions.length})</span>
                            </div>
                            {loading ? (
                                <div style={{ padding: 40, textAlign: "center" }}>
                                    <div className="spinner" style={{ borderColor: "rgba(26,71,49,0.3)", borderTopColor: "#1a4731", width: 32, height: 32, margin: "0 auto" }} />
                                </div>
                            ) : regions.length === 0 ? (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">🗺️</div>
                                    <div className="empty-state-text">No regions found</div>
                                    {canManage && <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Add the first region using the button above</div>}
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Region</th>
                                            <th>State / District</th>
                                            <th>Ecosystem</th>
                                            <th>Area (km²)</th>
                                            <th>Protection</th>
                                            <th>Added By</th>
                                            <th>Date</th>
                                            {canManage && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regions.map((r) => (
                                            <tr key={r._id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>{r.name}</div>
                                                    {r.description && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{r.description.slice(0, 60)}{r.description.length > 60 ? "…" : ""}</div>}
                                                </td>
                                                <td style={{ fontSize: 12, color: "#374151" }}>
                                                    {r.state}
                                                    {r.district && <div style={{ color: "#9ca3af", fontSize: 11 }}>{r.district}</div>}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: 13 }}>{ecosystemIcon[r.ecosystemType] || "🗺️"} {r.ecosystemType}</span>
                                                </td>
                                                <td style={{ fontSize: 12, color: "#6b7280" }}>{r.area > 0 ? r.area.toLocaleString() : "—"}</td>
                                                <td>
                                                    <span style={{
                                                        background: `${statusColor[r.protectionStatus] || "#6b7280"}18`,
                                                        color: statusColor[r.protectionStatus] || "#6b7280",
                                                        borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                                                        border: `1px solid ${statusColor[r.protectionStatus] || "#6b7280"}40`,
                                                    }}>{r.protectionStatus}</span>
                                                </td>
                                                <td style={{ fontSize: 12, color: "#374151" }}>{r.createdBy?.name || "—"}</td>
                                                <td style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                                {canManage && (
                                                    <td>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(r)}>Edit</button>
                                                            {canDelete && <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#dc2626", border: "none" }} onClick={() => handleDelete(r._id)}>Delete</button>}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
