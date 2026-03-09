"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { toast } from "react-toastify";

interface HeatmapData {
    count: number;
    gridCount?: number;
    precision?: number;
    zoom?: number;
    aggregated?: boolean;
    data: [number, number, number][]; // [lat, lng, intensity]
}

// Dynamically import the entire map component to avoid SSR issues
const HeatmapMap = dynamic(() => import("@/components/HeatmapMap"), { 
    ssr: false,
    loading: () => (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#6b7280" }}>Loading map...</p>
        </div>
    ),
});

const TimelineSlider = dynamic(() => import("@/components/TimelineSlider"), { 
    ssr: false
});

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

export default function HeatmapPage() {
    const [heatmapData, setHeatmapData] = useState<HeatmapData>({ count: 0, data: [] });
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [species, setSpecies] = useState("");
    const [riskLevel, setRiskLevel] = useState("");
    const [currentZoom, setCurrentZoom] = useState(2); // Track map zoom
    const [timelineEnabled, setTimelineEnabled] = useState(false); // Timeline mode

    const loadHeatmap = async (zoom?: number) => {
        setLoading(true);
        try {
            const zoomToUse = zoom !== undefined ? zoom : currentZoom;
            const params: any = { zoom: zoomToUse }; // Pass zoom to backend
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (species) params.species = species;
            if (riskLevel) params.riskLevel = riskLevel;

            const res = await api.get("/analytics/heatmap", { params });
            setHeatmapData(res.data);
            
            // Display aggregation info if available
            if (res.data.aggregated) {
                toast.success(`Loaded ${res.data.count} reports aggregated into ${res.data.gridCount} grid cells (${res.data.precision}° precision)`);
            } else {
                toast.success(`Loaded ${res.data.count} data points`);
            }
        } catch {
            toast.error("Failed to load heatmap data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHeatmap();
    }, []);

    const resetFilters = () => {
        setStartDate("");
        setEndDate("");
        setSpecies("");
        setRiskLevel("");
    };

    const handleZoomChange = (zoom: number) => {
        if (zoom !== currentZoom) {
            setCurrentZoom(zoom);
            // Auto-reload data when zoom changes to get appropriate aggregation
            loadHeatmap(zoom);
        }
    };

    const handleTimelineChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
        // Auto-reload when timeline changes
        setTimeout(() => loadHeatmap(), 100);
    };

    const toggleTimeline = () => {
        setTimelineEnabled(!timelineEnabled);
        if (timelineEnabled) {
            // Reset dates when disabling timeline
            setStartDate("");
            setEndDate("");
        }
    };

    return (
        <ProtectedRoute>
            <div className="app-shell">
                <Sidebar />
                <div className="main-content">
                    <div className="topbar">
                        <div>
                            <div className="topbar-title">🗺️ Species Heatmap</div>
                            <div className="topbar-subtitle">Interactive geographical distribution visualization</div>
                        </div>
                    </div>

                    <div className="page-wrapper" style={{ padding: 0, height: "calc(100vh - 70px)" }}>
                        {/* Filter Panel */}
                        <div style={{ position: "absolute", top: 20, left: 20, zIndex: 1000, background: "white", padding: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", maxWidth: 300 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Filters</div>
                            
                            {/* Timeline Toggle */}
                            <div style={{ marginBottom: 12, padding: 10, background: timelineEnabled ? "#dbeafe" : "#f3f4f6", borderRadius: 6, border: timelineEnabled ? "2px solid #3b82f6" : "none" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={timelineEnabled}
                                        onChange={toggleTimeline}
                                        style={{ cursor: "pointer" }}
                                    />
                                    <span style={{ fontWeight: 600 }}>🎬 Timeline Animation</span>
                                </label>
                            </div>
                            
                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Start Date</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                    disabled={timelineEnabled}
                                    style={{ fontSize: 12, padding: "6px 8px", opacity: timelineEnabled ? 0.5 : 1, cursor: timelineEnabled ? "not-allowed" : "text" }} 
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>End Date</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)} 
                                    disabled={timelineEnabled}
                                    style={{ fontSize: 12, padding: "6px 8px", opacity: timelineEnabled ? 0.5 : 1, cursor: timelineEnabled ? "not-allowed" : "text" }} 
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Species</label>
                                <input type="text" placeholder="Search species..." className="form-input" value={species} onChange={(e) => setSpecies(e.target.value)} style={{ fontSize: 12, padding: "6px 8px" }} />
                            </div>

                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Risk Level</label>
                                <select className="form-input" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} style={{ fontSize: 12, padding: "6px 8px" }}>
                                    <option value="">All Levels</option>
                                    {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={loadHeatmap} disabled={loading} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12, padding: "6px 10px" }}>
                                    {loading ? "Loading..." : "Apply"}
                                </button>
                                <button onClick={resetFilters} className="btn btn-secondary btn-sm" style={{ fontSize: 12, padding: "6px 10px" }}>
                                    Reset
                                </button>
                            </div>

                            <div style={{ marginTop: 12, padding: 8, background: "#f3f4f6", borderRadius: 4, fontSize: 11, color: "#6b7280", textAlign: "center" }}>
                                {heatmapData.aggregated ? (
                                    <>
                                        <div>{heatmapData.count} reports</div>
                                        <div>{heatmapData.gridCount} grid cells</div>
                                        <div>{heatmapData.precision}° precision</div>
                                    </>
                                ) : (
                                    <div>{heatmapData.count} data points</div>
                                )}
                            </div>
                        </div>

                        {/* Map Container */}
                        <div style={{ width: "100%", height: "100%" }}>
                            <HeatmapMap points={heatmapData.data} onZoomChange={handleZoomChange} />
                            
                            {/* Timeline Slider */}
                            {timelineEnabled && (
                                <TimelineSlider 
                                    onTimeChange={handleTimelineChange}
                                    minDate="2023-01-01"
                                    maxDate={new Date().toISOString().split('T')[0]}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
