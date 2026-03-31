import { NavLink } from "react-router-dom";
import { PlusCircle, List, History, Boxes, ChevronRight } from "lucide-react";
import { useRoomStore } from "@/store/useRoomStore";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const { user } = useRoomStore();

  const navItems = [
    { to: "/", icon: PlusCircle, label: "New Room" },
    { to: "/rooms", icon: List, label: "Active Rooms" },
    { to: "/history", icon: History, label: "History" },
  ];

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-all duration-300">
      {/* Brand */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 rotate-3 group-hover:rotate-0 transition-transform">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase italic">
            Poker App
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <p className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Main Menu
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 border border-transparent",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white",
              )
            }
          >
            <div className="flex items-center gap-3">
              <item.icon
                className={cn(
                  "w-5 h-5",
                  "transition-transform group-hover:scale-110",
                )}
              />
              <span className="font-semibold text-sm">{item.label}</span>
            </div>
            <ChevronRight
              className={cn(
                "w-4 h-4 opacity-0 transition-all -translate-x-2",
                "group-hover:opacity-100 group-hover:translate-x-0",
              )}
            />
          </NavLink>
        ))}
      </nav>

      {/* User Session */}
      <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/30">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-white font-bold text-xs uppercase">
                {user?.email?.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-indigo-500 cursor-default transition-colors">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
