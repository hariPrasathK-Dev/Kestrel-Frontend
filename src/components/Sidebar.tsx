"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ─── SVG Nav Icons ─── */
const Icons = {
    dashboard: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    report: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
        </svg>
    ),
    analytics: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
    ),
    forum: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    admin: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            <path d="M12 2v2m0 18v-2m10-8h-2M4 12H2" />
        </svg>
    ),
    profile: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    signout: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
};

/* ─── Extra SVG Icons ─── */
const ExtraIcons = {
    document: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
        </svg>
    ),
    officer: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    map: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
        </svg>
    ),
    region: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
        </svg>
    ),
    alert: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    anomaly: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
};

const NAV = [
    { href: "/dashboard", icon: Icons.dashboard, label: "Dashboard", roles: ["user", "officer", "admin"] },
    { href: "/documents", icon: ExtraIcons.document, label: "Documents", roles: ["user", "officer", "admin"] },
    { href: "/report", icon: Icons.report, label: "Submit Report", roles: ["user", "officer", "admin"] },
    { href: "/regions", icon: ExtraIcons.region, label: "Regions", roles: ["officer", "admin"] },
    { href: "/alerts", icon: ExtraIcons.alert, label: "Alerts", roles: ["user", "officer", "admin"] },
    { href: "/anomalies", icon: ExtraIcons.anomaly, label: "Anomalies", roles: ["officer", "admin"] },
    { href: "/officer", icon: ExtraIcons.officer, label: "Officer Panel", roles: ["officer", "admin"] },
    { href: "/analytics", icon: Icons.analytics, label: "Analytics", roles: ["user", "officer", "admin"] },
    { href: "/forum", icon: Icons.forum, label: "Community", roles: ["user", "officer", "admin"] },
    { href: "/admin", icon: Icons.admin, label: "Admin Panel", roles: ["admin"] },
    { href: "/profile", icon: Icons.profile, label: "Profile", roles: ["user", "officer", "admin"] },
];

const KestrelIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 8v4l4-2v4l4 4 4-4v-4l4 2V8L12 2z" fill="white" opacity="0.9" />
        <path d="M12 14l-3 3h6l-3-3z" fill="white" opacity="0.6" />
    </svg>
);

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    if (!user) return null;

    const navItems = NAV.filter((n) => n.roles.includes(user.role));
    const initials = user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

    return (
        <nav className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <KestrelIcon />
                </div>
                <div>
                    <div className="sidebar-logo-text">KESTREL</div>
                    <div className="sidebar-logo-sub">Biodiversity Platform</div>
                </div>
            </div>

            {/* Nav */}
            <div className="sidebar-nav">
                <div className="sidebar-section-label">Navigation</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.name}</div>
                        <div className="sidebar-user-role">
                            {user.role}
                            {user.contributionScore > 0 && (
                                <span style={{ marginLeft: 6, color: "#5cb887" }}>· {user.contributionScore} pts</span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn-ghost btn-sm btn-block"
                    onClick={logout}
                    style={{ color: "rgba(255,255,255,0.45)", justifyContent: "flex-start", gap: 8 }}
                >
                    {Icons.signout}
                    Sign out
                </button>
            </div>
        </nav>
    );
}
