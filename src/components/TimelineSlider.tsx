"use client";

import { useEffect, useState, useRef } from "react";

interface TimelineSliderProps {
    onTimeChange: (startDate: string, endDate: string) => void;
    minDate?: string;
    maxDate?: string;
}

export default function TimelineSlider({ onTimeChange, minDate, maxDate }: TimelineSliderProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [timeWindow, setTimeWindow] = useState<number>(30); // days
    const [speed, setSpeed] = useState<number>(1000); // ms per step
    const [rangeStart, setRangeStart] = useState<Date>(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)); // 1 year ago
    const [rangeEnd, setRangeEnd] = useState<Date>(new Date());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize date range from props
    useEffect(() => {
        if (minDate) setRangeStart(new Date(minDate));
        if (maxDate) setRangeEnd(new Date(maxDate));
        if (!minDate && !maxDate) {
            // Default to last year
            const end = new Date();
            const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            setRangeStart(start);
            setRangeEnd(end);
            setCurrentDate(start);
        }
    }, [minDate, maxDate]);

    // Format date to YYYY-MM-DD
    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Calculate end date based on time window
    const getEndDate = (startDate: Date): string => {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + timeWindow);
        return formatDate(endDate);
    };

    // Animation loop
    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentDate(prev => {
                    const next = new Date(prev);
                    next.setDate(next.getDate() + Math.ceil(timeWindow / 7)); // Move by ~1 week increments
                    
                    // Loop back to start if reached end
                    if (next > rangeEnd) {
                        return new Date(rangeStart);
                    }
                    return next;
                });
            }, speed);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, speed, rangeStart, rangeEnd, timeWindow]);

    // Notify parent when date changes
    useEffect(() => {
        onTimeChange(formatDate(currentDate), getEndDate(currentDate));
    }, [currentDate, timeWindow]);

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentDate(new Date(rangeStart));
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        const totalDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
        const targetDate = new Date(rangeStart);
        targetDate.setDate(targetDate.getDate() + Math.floor((value / 100) * totalDays));
        setCurrentDate(targetDate);
    };

    const getCurrentSliderPosition = (): number => {
        const totalDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
        const currentDays = Math.floor((currentDate.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
        return Math.floor((currentDays / totalDays) * 100);
    };

    return (
        <div style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "16px 20px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            minWidth: 600,
            maxWidth: "80%"
        }}>
            {/* Current Date Display */}
            <div style={{ 
                textAlign: "center", 
                fontSize: 16, 
                fontWeight: 700, 
                marginBottom: 12,
                color: "#1f2937"
            }}>
                {formatDate(currentDate)} to {getEndDate(currentDate)}
            </div>

            {/* Timeline Slider */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={getCurrentSliderPosition()}
                    onChange={handleSliderChange}
                    disabled={isPlaying}
                    style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 4,
                        outline: "none",
                        cursor: isPlaying ? "not-allowed" : "pointer"
                    }}
                />
                <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    fontSize: 11, 
                    color: "#6b7280",
                    marginTop: 4
                }}>
                    <span>{formatDate(rangeStart)}</span>
                    <span>{formatDate(rangeEnd)}</span>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* Play/Pause Button */}
                <button
                    onClick={handlePlayPause}
                    style={{
                        padding: "8px 16px",
                        background: isPlaying ? "#ef4444" : "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                    }}
                >
                    {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>

                {/* Reset Button */}
                <button
                    onClick={handleReset}
                    style={{
                        padding: "8px 16px",
                        background: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    ⟲ Reset
                </button>

                {/* Window Size Control */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                        Window:
                    </label>
                    <select
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(parseInt(e.target.value))}
                        style={{
                            padding: "6px 8px",
                            fontSize: 12,
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            background: "white"
                        }}
                    >
                        <option value={7}>1 Week</option>
                        <option value={30}>1 Month</option>
                        <option value={90}>3 Months</option>
                        <option value={180}>6 Months</option>
                    </select>
                </div>

                {/* Speed Control */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                        Speed:
                    </label>
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                        style={{
                            padding: "6px 8px",
                            fontSize: 12,
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            background: "white"
                        }}
                    >
                        <option value={2000}>0.5x</option>
                        <option value={1000}>1x</option>
                        <option value={500}>2x</option>
                        <option value={250}>4x</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
