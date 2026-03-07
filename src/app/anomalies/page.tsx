"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import ChartWidget from "@/components/ChartWidget";
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
    detectionMethod?: string;
    reviewNotes: string;
    reportedBy?: { name: string };
    createdAt: string;
}

interface Stats {
    totals: {
        total: number;
        open: number;
        critical: number;
    };
    typeBreakdown: { _id: string; count: number }[];
    severityBreakdown: { _id: string; count: number }[];
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
    const [stats, setStats] = useState<Stats | null>(null);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [detecting, setDetecting] = useState(false);
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

    const loadStats = async () => {
        try {
            const res = await api.get("/anomalies/stats");
            setStats(res.data);
        } catch { /* silent */ }
    };

    const loadRegions = async () => {
        try {
            const res = await api.get("/regions?limit=100");
            setRegions(res.data.regions);
        } catch { /* silent */ }
    };

    useEffect(() => { loadAnomalies(); loadStats(); loadRegions(); }, [severityFilter, statusFilter]);

    const runAutoDetection = async () => {
        if (!confirm("Run automated anomaly detection? This will analyze all recent reports.")) return;
        setDetecting(true);
        try {
            const res = await api.post("/anomalies/detect");
            toast.success(`Detection complete! Found ${res.data.detected} new anomalies.`);
            loadAnomalies();
            loadStats();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Detection failed");
        } finally {
            setDetecting(false);
        }
    };

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
            loadStats();
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
            loadStats();
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
            loadStats();
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
                            <div className="topbar-title">⚠️ Anomaly Detection</div>
                            <div className="topbar-subtitle">Automated and manual ecological threat monitoring</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            {canManage && (
                                <>
                                    <button className="btn btn-secondary btn-sm" onClick={runAutoDetection} disabled={detecting}>
                                        {detecting ? "Analyzing..." : "🔍 Run Auto-Detection"}
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
                                        + Report Anomaly
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="page-wrapper">
                        {/* Stats Cards */}
                        {stats && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
                                {[
                                    { label: "Total Anomalies", value: stats.totals.total, icon: "⚠️", bg: "#fef9c3" },
                                    { label: "Open Cases", value: stats.totals.open, icon: "🚨", bg: "#fee2e2" },
                                    { label: "Critical Severity", value: stats.totals.critical, icon: "‼️", bg: "#ffe4e6" },
                                ].map((s) => (
                                    <div className="stat-card" key={s.label}>
                                        <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                                        <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Charts */}
                        {stats && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">Anomaly Types</span></div>
                                    <ChartWidget
                                        type="bar"
                                        height={240}
                                        labels={stats.typeBreakdown.map(t => t._id)}
                                        datasets={[{ label: "Count", data: stats.typeBreakdown.map(t => t.count) }]}
                                    />
                                </div>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">Severity Distribution</span></div>
                                    <ChartWidget
                                        type="doughnut"
                                        height={240}
                                        labels={stats.severityBreakdown.map(s => s._id)}
                                        datasets={[{ label: "Anomalies", data: stats.severityBreakdown.map(s => s.count) }]}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                            <select className="form-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ fontSize: 13, padding: "6px 10px", width: 180 }}>
                                <option value="">All Severities</option>
                                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ fontSize: 13, padding: "6px 10px", width: 180 }}>
                                <option value="">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="under_review">Under Review</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>

                        {/* Anomalies Table */}
                        <div className="card">
                            <div className="card-header"><span className="card-title">Anomaly Reports</span></div>
                            {loading ? (
                                <p style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading...</p>
                            ) : anomalies.length === 0 ? (
                                <p style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No anomalies found</p>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Region</th>
                                            <th>Type</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Method</th>
                                            <th>Description</th>
                                            <th>Detected</th>
                                            {canManage && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {anomalies.map((a) => (
                                            <tr key={a._id}>
                                                <td style={{ fontWeight: 600 }}>{a.region || "—"}</td>
                                                <td>{a.type}</td>
                                                <td>
                                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: severityColor[a.severity], color: "white" }}>
                                                        {a.severity}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusColor[a.status], color: "white" }}>
                                                        {statusLabel[a.status]}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: 11, color: a.detectionMethod === "automated" ? "#2563eb" : "#6b7280" }}>
                                                        {a.detectionMethod === "automated" ? "🤖 Auto" : "👤 Manual"}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12, maxWidth: 300 }}>{a.description}</td>
                                                <td style={{ fontSize: 12, color: "#6b7280" }}>{new Date(a.detectedAt).toLocaleDateString()}</td>
                                                {canManage && (
                                                    <td>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button 
                                                                onClick={() => { setReviewTarget(a); setReviewNote(a.reviewNotes || ""); setReviewStatus(a.status); }} 
                                                                className="btn btn-sm btn-secondary"
                                                            >
                                                                Review
                                                            </button>
                                                            {canDelete && (
                                                                <button onClick={() => handleDelete(a._id)} className="btn btn-sm" style={{ background: "#fee2e2", color: "#dc2626" }}>
                                                                    Delete
                                                                </button>
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

                    {/* Report Form Modal */}
                    {showForm && (
                        <div className="modal-overlay" onClick={() => setShowForm(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <span className="modal-title">Report Anomaly</span>
                                    <button onClick={() => setShowForm(false)} className="modal-close">✕</button>
                                </div>
                                <form onSubmit={handleSubmit} style={{ padding: 20 }}>
                                    <div className="form-group">
                                        <label className="form-label">Region *</label>
                                        <input className="form-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                            {ANOMALY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Severity</label>
                                        <select className="form-input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                                            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description *</label>
                                        <textarea className="form-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required></textarea>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                        <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                                        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Submitting..." : "Report Anomaly"}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Review Modal */}
                    {reviewTarget && (
                        <div className="modal-overlay" onClick={() => setReviewTarget(null)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <span className="modal-title">Review Anomaly</span>
                                    <button onClick={() => setReviewTarget(null)} className="modal-close">✕</button>
                                </div>
                                <div style={{ padding: 20 }}>
                                    <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{reviewTarget.type} - {reviewTarget.region}</div>
                                        <div style={{ fontSize: 12, color: "#6b7280" }}>{reviewTarget.description}</div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-input" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                                            <option value="open">Open</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Review Notes</label>
                                        <textarea className="form-input" rows={4} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}></textarea>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                        <button onClick={() => setReviewTarget(null)} className="btn btn-secondary">Cancel</button>
                                        <button onClick={submitReview} className="btn btn-primary">Submit Review</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
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
