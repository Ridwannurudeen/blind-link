import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletButton } from "./WalletButton";
import {
  LayoutDashboard, UserPlus, Search as SearchIcon, Shield, Clock,
  ChevronLeft, Menu, Command, Activity, Radio,
} from "lucide-react";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/register", label: "Registry", icon: UserPlus },
  { path: "/discover", label: "Discovery", icon: SearchIcon },
  { path: "/how-it-works", label: "Protocol", icon: Shield },
  { path: "/history", label: "History", icon: Clock },
] as const;

/* Simulated MXE heartbeats */
const HEARTBEAT_MSGS = [
  "MXE node-0 heartbeat OK",
  "Cerberus share sync #41c2",
  "Computation queue: idle",
  "Node-1 attestation verified",
  "Registry state hash: 7f3a...",
  "MPC round completed",
  "Node-2 shard rotated",
];

interface Heartbeat { ts: string; msg: string; id: number }

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const pageName = NAV.find((n) => isActive(n.path))?.label || "Dashboard";

  // Simulate live heartbeats
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const msg = HEARTBEAT_MSGS[Math.floor(Math.random() * HEARTBEAT_MSGS.length)];
      const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setHeartbeats((prev) => [{ ts, msg, id: id++ }, ...prev].slice(0, 6));
    };
    tick();
    const iv = setInterval(tick, 4000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, []);

  // Cmd+K handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((o) => !o);
    }
    if (e.key === "Escape") setSearchOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Cmd+K Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272a]">
              <SearchIcon size={16} className="text-zinc-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search commands, sessions, addresses..."
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              />
              <kbd className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">ESC</kbd>
            </div>
            <div className="p-2">
              {NAV.map((n) => (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
                >
                  <n.icon size={15} />
                  <span>{n.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#09090b] border-r border-[#1f1f23]
        transition-all duration-200
        ${collapsed ? "w-[52px]" : "w-[220px]"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Brand */}
        <div className={`flex items-center h-[52px] border-b border-[#1f1f23] ${collapsed ? "justify-center px-1" : "px-4"}`}>
          {collapsed ? (
            <div className="w-7 h-7 rounded-md bg-arcium/10 flex items-center justify-center">
              <span className="text-arcium font-bold text-xs">B</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-arcium/10 flex items-center justify-center">
                <Shield size={14} className="text-arcium" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-zinc-100 leading-tight">Blind-Link</span>
                <span className="text-[10px] text-zinc-600 leading-tight">by Arcium</span>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-1.5 overflow-y-auto">
          <div className={`mb-2 ${collapsed ? "hidden" : ""}`}>
            <span className="px-2.5 text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Navigation</span>
          </div>
          {NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium mb-0.5
                transition-colors duration-100
                ${isActive(item.path)
                  ? "bg-arcium/8 text-arcium"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                }
                ${collapsed ? "justify-center px-0" : ""}
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Live Computation Stream */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="bg-[#121215] border border-[#1f1f23] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity size={11} className="text-arcium" />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">MXE Stream</span>
                <Radio size={8} className="text-green-500 pulse-dot ml-auto" />
              </div>
              <div className="space-y-1 max-h-[120px] overflow-hidden">
                {heartbeats.map((hb) => (
                  <div key={hb.id} className="stream-entry flex items-start gap-1.5">
                    <span className="text-[9px] text-zinc-700 font-mono whitespace-nowrap mt-px">{hb.ts}</span>
                    <span className="text-[10px] text-zinc-500 leading-tight">{hb.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom */}
        <div className={`border-t border-[#1f1f23] py-2 ${collapsed ? "px-1" : "px-2"}`}>
          {/* MXE Status */}
          <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}>
            <span className="w-[6px] h-[6px] rounded-full bg-amber-500 pulse-dot flex-shrink-0" />
            {!collapsed && <span className="text-[11px] text-zinc-600">MXE Offline</span>}
          </div>
          {/* Collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-full py-1.5 mt-1 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 rounded-md transition-colors"
          >
            <ChevronLeft size={14} className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-[52px] px-4 lg:px-6 border-b border-[#1f1f23] bg-[#09090b]/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1 text-zinc-500 hover:text-zinc-300">
              <Menu size={18} />
            </button>
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5 text-[13px]">
              <span className="text-zinc-600">Blind-Link</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-300 font-medium">{pageName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="search-trigger hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#27272a] bg-[#121215] text-[12px] text-zinc-500"
            >
              <SearchIcon size={13} />
              <span>Search...</span>
              <div className="flex items-center gap-0.5 ml-4">
                <kbd className="text-[10px] text-zinc-600 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">
                  <Command size={9} className="inline" />
                </kbd>
                <kbd className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">K</kbd>
              </div>
            </button>

            {/* Network toggle */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#27272a] bg-[#121215]">
              <span className="w-[6px] h-[6px] rounded-full bg-arcium pulse-dot" />
              <span className="text-[11px] font-medium text-zinc-400">Devnet</span>
            </div>

            <WalletButton />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto mesh-bg">
          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
