"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { toast } from "react-toastify";

interface Region { _id: string; name: string; }
interface Alert {
    _id: string;
    message: string;
    region: string;
    severity: string;
    status: string;
    expiryDate?: string;
    createdBy?: { name: string };
    feedbacks: { userId: string; comment: string; createdAt: string }[];
    createdAt: string;
}

const SEVERITIES = ["Info", "Warning", "Critical"];
const severityColor: Record<string, string> = {
    Info: "#2563eb", Warning: "#ca8a04", Critical: "#dc2626",
};
const statusColor: Record<string, string> = {
    active: "#16a34a", resolved: "#6b7280",
};

const emptyForm = { message: "", region: "", severity: "Warning", expiryDate: "" };

export default function AlertsPage() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [severityFilter, setSeverityFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const canManage = user?.role === "officer" || user?.role === "admin";

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (severityFilter) params.set("severity", severityFilter);
            if (statusFilter) params.set("status", statusFilter);
            const res = await api.get(`/alerts?${params.toString()}`);
            setAlerts(res.data);
        } catch {
            toast.error("Failed to load alerts");
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

    useEffect(() => { loadAlerts(); loadRegions(); }, [severityFilter, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.message.trim() || !form.region.trim()) return toast.error("Message and region are required");
        setSaving(true);
        try {
            await api.post("/alerts", { ...form });
            toast.success("Alert created");
            setShowForm(false);
            setForm(emptyForm);
            loadAlerts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to create alert");
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (alert: Alert) => {
        try {
            const newStatus = alert.status === "active" ? "resolved" : "active";
            await api.put(`/alerts/${alert._id}`, { status: newStatus });
            toast.success(`Alert marked as ${newStatus}`);
            loadAlerts();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this alert?")) return;
        try {
            await api.delete(`/alerts/${id}`);
            toast.success("Alert deleted");
            loadAlerts();
        } catch {
            toast.error("Delete failed");
        }
    };

    const submitFeedback = async (alertId: string) => {
        const comment = feedbackText[alertId]?.trim();
        if (!comment) return toast.error("Enter a comment first");
        try {
            await api.post(`/alerts/${alertId}/feedback`, { comment });
            toast.success("Feedback submitted");
            setFeedbackText((f) => ({ ...f, [alertId]: "" }));
            loadAlerts();
        } catch {
            toast.error("Failed to submit feedback");
        }
    };

    return (
        <ProtectedRoute>
            <div className="app-shell">
                <Sidebar />
                <div className="main-content">
                    <div className="topbar">
                        <div>
                            <div className="topbar-title">Alerts</div>
                            <div className="topbar-subtitle">Regional wildlife and conservation alerts</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <select className="form-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ fontSize: 13, padding: "6px 10px" }}>
                                <option value="">All Severities</option>
                                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ fontSize: 13, padding: "6px 10px" }}>
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="resolved">Resolved</option>
                            </select>
                            {canManage && (
                                <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
                                    + Create Alert
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="page-wrapper">
                        {/* Create Form */}
                        {showForm && canManage && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-header">
                                    <span className="card-title">Create New Alert</span>
                                    <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(false)}>✕</button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Alert Message *</label>
                                        <textarea className="form-textarea" value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe the alert situation..." style={{ minHeight: 80 }} />
                                    </div>
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
                                            <label className="form-label">Severity</label>
                                            <select className="form-select" value={form.severity} onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}>
                                                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Expiry Date (optional)</label>
                                            <input className="form-input" type="date" value={form.expiryDate} onChange={(e) => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create Alert"}</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Alerts Table */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Alerts ({alerts.length})</span>
                            </div>
                            {loading ? (
                                <div style={{ padding: 40, textAlign: "center" }}>
                                    <div className="spinner" style={{ borderColor: "rgba(26,71,49,0.3)", borderTopColor: "#1a4731", width: 32, height: 32, margin: "0 auto" }} />
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">🔔</div>
                                    <div className="empty-state-text">No alerts found</div>
                                    {canManage && <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Create the first alert using the button above</div>}
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Message</th>
                                            <th>Region</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Expires</th>
                                            <th>Created By</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alerts.map((a) => (
                                            <>
                                                <tr key={a._id} onClick={() => setExpandedId(expandedId === a._id ? null : a._id)} style={{ cursor: "pointer" }}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>{a.message.slice(0, 80)}{a.message.length > 80 ? "…" : ""}</div>
                                                        <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{a.feedbacks.length} feedback(s) · click to expand</div>
                                                    </td>
                                                    <td style={{ fontSize: 12, color: "#374151" }}>{a.region}</td>
                                                    <td>
                                                        <span style={{ background: `${severityColor[a.severity]}18`, color: severityColor[a.severity], borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${severityColor[a.severity]}40` }}>
                                                            {a.severity}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ background: `${statusColor[a.status]}18`, color: statusColor[a.status], borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${statusColor[a.status]}40` }}>
                                                            {a.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: 11, color: "#9ca3af" }}>{a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : "—"}</td>
                                                    <td style={{ fontSize: 12, color: "#374151" }}>{a.createdBy?.name || "—"}</td>
                                                    <td style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            {canManage && (
                                                                <>
                                                                    <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(a)}>
                                                                        {a.status === "active" ? "Resolve" : "Reopen"}
                                                                    </button>
                                                                    {user?.role === "admin" && (
                                                                        <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#dc2626", border: "none" }} onClick={() => handleDelete(a._id)}>Del</button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedId === a._id && (
                                                    <tr key={`${a._id}-expanded`}>
                                                        <td colSpan={8} style={{ background: "#f9fafb", padding: "16px 24px" }}>
                                                            <div style={{ marginBottom: 10 }}>
                                                                <strong style={{ fontSize: 12 }}>Full Message:</strong>
                                                                <p style={{ color: "#374151", fontSize: 13, marginTop: 4 }}>{a.message}</p>
                                                            </div>
                                                            <div style={{ marginBottom: 10 }}>
                                                                <strong style={{ fontSize: 12 }}>Feedback ({a.feedbacks.length})</strong>
                                                                {a.feedbacks.length === 0 ? (
                                                                    <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>No feedback yet</div>
                                                                ) : (
                                                                    <div style={{ marginTop: 6 }}>
                                                                        {a.feedbacks.map((fb, i) => (
                                                                            <div key={i} style={{ background: "white", borderRadius: 6, padding: "8px 12px", marginBottom: 6, fontSize: 12, border: "1px solid #e5e7eb" }}>
                                                                                {fb.comment}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: "flex", gap: 8 }}>
                                                                <input
                                                                    className="form-input"
                                                                    placeholder="Add your feedback..."
                                                                    value={feedbackText[a._id] || ""}
                                                                    onChange={(e) => setFeedbackText((f) => ({ ...f, [a._id]: e.target.value }))}
                                                                    style={{ fontSize: 12, flex: 1 }}
                                                                />
                                                                <button className="btn btn-primary btn-sm" onClick={() => submitFeedback(a._id)}>Submit</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
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
