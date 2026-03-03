"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { toast } from "react-toastify";

interface Region { _id: string; name: string; }
interface Anomaly {
    _id: string;
    region: string;
    type: string;
    severity: string;
    description: string;
    status: string;
    detectedAt: string;
    reviewNotes: string;
    reportedBy?: { name: string };
    createdAt: string;
}

const ANOMALY_TYPES = ["Population Decline", "Invasive Species", "Habitat Loss", "Disease Outbreak", "Unusual Migration", "Other"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];

const severityColor: Record<string, string> = {
    Low: "#16a34a", Medium: "#ca8a04", High: "#ea580c", Critical: "#dc2626",
};
const statusColor: Record<string, string> = {
    open: "#dc2626", under_review: "#ca8a04", resolved: "#16a34a",
};
const statusLabel: Record<string, string> = {
    open: "Open", under_review: "Under Review", resolved: "Resolved",
};

const emptyForm = { region: "", type: "Population Decline", severity: "Medium", description: "" };

export default function AnomaliesPage() {
    const { user } = useAuth();
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [severityFilter, setSeverityFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [reviewTarget, setReviewTarget] = useState<Anomaly | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [reviewStatus, setReviewStatus] = useState("under_review");

    const canManage = user?.role === "officer" || user?.role === "admin";
    const canDelete = user?.role === "admin";

    const loadAnomalies = async () => {
        setLoading(true);
        try {
            const res = await api.get("/anomalies");
            let data: Anomaly[] = res.data;
            if (severityFilter) data = data.filter((a) => a.severity === severityFilter);
            if (statusFilter) data = data.filter((a) => a.status === statusFilter);
            setAnomalies(data);
        } catch {
            toast.error("Failed to load anomalies");
        } finally {
            setLoading(false);
        }
    };

    const loadRegions = async () => {
        try {
            const res = await api.get("/regions?limit=100");
            setRegions(res.data.regions);
        } catch { /* silent */ }
    };

    useEffect(() => { loadAnomalies(); loadRegions(); }, [severityFilter, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.region.trim()) return toast.error("Region is required");
        setSaving(true);
        try {
            await api.post("/anomalies", form);
            toast.success("Anomaly reported");
            setShowForm(false);
            setForm(emptyForm);
            loadAnomalies();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to report anomaly");
        } finally {
            setSaving(false);
        }
    };

    const submitReview = async () => {
        if (!reviewTarget) return;
        try {
            await api.patch(`/anomalies/${reviewTarget._id}/review`, { status: reviewStatus, reviewNotes: reviewNote });
            toast.success("Review submitted");
            setReviewTarget(null);
            setReviewNote("");
            loadAnomalies();
        } catch {
            toast.error("Failed to submit review");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this anomaly report?")) return;
        try {
            await api.delete(`/anomalies/${id}`);
            toast.success("Anomaly deleted");
            loadAnomalies();
        } catch {
            toast.error("Delete failed");
        }
    };

    return (
        <ProtectedRoute>
            <div className="app-shell">
                <Sidebar />
                <div className="main-content">
                    <div className="topbar">
                        <div>
                            <div className="topbar-title">Anomalies</div>
                            <div className="topbar-subtitle">Track and review ecological anomalies</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <select className="form-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ fontSize: 13, padding: "6px 10px" }}>
                                <option value="">All Severities</option>
                                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ fontSize: 13, padding: "6px 10px" }}>
                                <option value="">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="under_review">Under Review</option>
                                <option value="resolved">Resolved</option>
                            </select>
                            {canManage && (
                                <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
                                    + Report Anomaly
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="page-wrapper">
                        {/* Report Form */}
                        {showForm && canManage && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-header">
                                    <span className="card-title">Report New Anomaly</span>
                                    <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(false)}>✕</button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="grid-2" style={{ marginBottom: 12 }}>
                                        <div className="form-group">
                                            <label className="form-label">Region *</label>
                                            {regions.length > 0 ? (
                                                <select className="form-select" value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))}>
                                                    <option value="">Select a region…</option>
                                                    {regions.map((r) => <option key={r._id} value={r.name}>{r.name}</option>)}
                                                </select>
                                            ) : (
                                                <input className="form-input" value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Region name" />
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Anomaly Type</label>
                                            <select className="form-select" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                                                {ANOMALY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Severity</label>
                                            <select className="form-select" value={form.severity} onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}>
                                                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-textarea" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the observed anomaly in detail..." style={{ minHeight: 80 }} />
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Submitting..." : "Report Anomaly"}</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Review Modal */}
                        {reviewTarget && (
                            <div className="card" style={{ marginBottom: 20, border: "1px solid #fbbf24" }}>
                                <div className="card-header">
                                    <span className="card-title">Review Anomaly — {reviewTarget.type} in {reviewTarget.region}</span>
                                    <button className="btn btn-sm btn-ghost" onClick={() => setReviewTarget(null)}>✕</button>
                                </div>
                                <div style={{ padding: "0 0 12px 0" }}>
                                    <div className="form-group">
                                        <label className="form-label">Update Status</label>
                                        <select className="form-select" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                                            <option value="open">Open</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Review Notes</label>
                                        <textarea className="form-textarea" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add your review findings or actions taken..." style={{ minHeight: 72 }} />
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button className="btn btn-primary" onClick={submitReview}>Submit Review</button>
                                        <button className="btn btn-secondary" onClick={() => setReviewTarget(null)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Anomaly Reports ({anomalies.length})</span>
                            </div>
                            {loading ? (
                                <div style={{ padding: 40, textAlign: "center" }}>
                                    <div className="spinner" style={{ borderColor: "rgba(26,71,49,0.3)", borderTopColor: "#1a4731", width: 32, height: 32, margin: "0 auto" }} />
                                </div>
                            ) : anomalies.length === 0 ? (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">⚠️</div>
                                    <div className="empty-state-text">No anomalies reported</div>
                                    {canManage && <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Use the button above to report an anomaly</div>}
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Region</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Description</th>
                                            <th>Reported By</th>
                                            <th>Detected</th>
                                            {canManage && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {anomalies.map((a) => (
                                            <tr key={a._id}>
                                                <td style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{a.type}</td>
                                                <td style={{ fontSize: 12, color: "#374151" }}>{a.region}</td>
                                                <td>
                                                    <span style={{ background: `${severityColor[a.severity]}18`, color: severityColor[a.severity], borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${severityColor[a.severity]}40` }}>
                                                        {a.severity}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ background: `${statusColor[a.status]}18`, color: statusColor[a.status], borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${statusColor[a.status]}40` }}>
                                                        {statusLabel[a.status] || a.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12, color: "#6b7280", maxWidth: 220 }}>
                                                    {a.description ? `${a.description.slice(0, 70)}${a.description.length > 70 ? "…" : ""}` : "—"}
                                                    {a.reviewNotes && <div style={{ color: "#2563eb", fontSize: 11, marginTop: 2 }}>Review: {a.reviewNotes.slice(0, 50)}</div>}
                                                </td>
                                                <td style={{ fontSize: 12, color: "#374151" }}>{a.reportedBy?.name || "—"}</td>
                                                <td style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(a.detectedAt).toLocaleDateString()}</td>
                                                {canManage && (
                                                    <td>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button className="btn btn-sm btn-secondary" onClick={() => { setReviewTarget(a); setReviewStatus(a.status); setReviewNote(a.reviewNotes || ""); }}>
                                                                Review
                                                            </button>
                                                            {canDelete && (
                                                                <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#dc2626", border: "none" }} onClick={() => handleDelete(a._id)}>Del</button>
                                                            )}
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
