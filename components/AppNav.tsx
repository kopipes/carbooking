"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Icons
function CarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h12l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
      <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="17.5" r="2.5" />
    </svg>
  );
}
function RoomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}
function CalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const carItems = [
  { href: "/bookings",  label: "Daftar Booking", icon: <CarIcon className="w-3.5 h-3.5" /> },
  { href: "/calendar",  label: "Kalender",       icon: <CalIcon className="w-3.5 h-3.5" /> },
];
const meetingItems = [
  { href: "/meeting-bookings",  label: "Daftar Booking", icon: <RoomIcon className="w-3.5 h-3.5" /> },
  { href: "/meeting-calendar",  label: "Kalender",       icon: <CalIcon  className="w-3.5 h-3.5" /> },
];
const adminItems = [
  { href: "/admin/users",         label: "Users"         },
  { href: "/admin/divisions",     label: "Divisions"     },
  { href: "/admin/cars",          label: "Cars"          },
  { href: "/admin/drivers",       label: "Drivers"       },
  { href: "/admin/assignments",   label: "Penugasan"     },
  { href: "/admin/meeting-rooms", label: "Meeting Rooms" },
];

export default function AppNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen,  setAdminOpen]  = useState(false);
  const role = session?.user?.role;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isCarActive     = carItems.some(i => isActive(i.href))     || isActive("/bookings/new");
  const isMeetingActive = meetingItems.some(i => isActive(i.href)) || isActive("/meeting-bookings/new");

  return (
    <>
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/dashboard"
            className="font-bold text-lg tracking-tight text-gray-900 shrink-0 flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
              <GridIcon className="w-3.5 h-3.5 text-white" />
            </span>
            Booking
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1">

            {/* Dashboard */}
            <Link href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive("/dashboard") ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}>
              <GridIcon className="w-3.5 h-3.5" />
              Dashboard
            </Link>

            {/* Separator */}
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Kendaraan group */}
            <div className={`flex items-center rounded-xl transition-all ${isCarActive ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-gray-50"}`}>
              <span className={`flex items-center gap-1.5 pl-3 pr-1 py-1.5 text-sm font-semibold ${isCarActive ? "text-blue-700" : "text-gray-500"}`}>
                <CarIcon className="w-3.5 h-3.5" />
                Kendaraan
              </span>
              {carItems.map(item => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all mx-0.5 ${
                    isActive(item.href)
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-blue-600/70 hover:bg-blue-100 hover:text-blue-700"
                  }`}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link href="/bookings/new"
                className="mx-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-all">
                <span className="text-base leading-none">+</span>
                Baru
              </Link>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Meeting Room group */}
            <div className={`flex items-center rounded-xl transition-all ${isMeetingActive ? "bg-purple-50 ring-1 ring-purple-100" : "hover:bg-gray-50"}`}>
              <span className={`flex items-center gap-1.5 pl-3 pr-1 py-1.5 text-sm font-semibold ${isMeetingActive ? "text-purple-700" : "text-gray-500"}`}>
                <RoomIcon className="w-3.5 h-3.5" />
                Meeting Room
              </span>
              {meetingItems.map(item => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all mx-0.5 ${
                    isActive(item.href)
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-purple-600/70 hover:bg-purple-100 hover:text-purple-700"
                  }`}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link href="/meeting-bookings/new"
                className="mx-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-600 hover:bg-purple-100 transition-all">
                <span className="text-base leading-none">+</span>
                Baru
              </Link>
            </div>

            {/* Admin dropdown */}
            {role === "ADMIN" && (
              <>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <div className="relative">
                  <button
                    onClick={() => setAdminOpen(o => !o)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      adminOpen || adminItems.some(i => isActive(i.href))
                        ? "bg-orange-50 text-orange-700"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}>
                    <span className="text-xs font-bold tracking-wide uppercase">Admin</span>
                    <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${adminOpen ? "rotate-180" : ""}`} />
                  </button>
                  {adminOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50"
                      onMouseLeave={() => setAdminOpen(false)}>
                      {adminItems.map(item => (
                        <Link key={item.href} href={item.href}
                          onClick={() => setAdminOpen(false)}
                          className={`flex items-center px-3 py-2 text-sm transition-colors ${
                            isActive(item.href)
                              ? "bg-orange-50 text-orange-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Desktop right: user + logout */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <span className="text-sm text-gray-700 font-medium max-w-24 truncate">{session?.user?.name}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
              Keluar
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menu">
            <span className={`block w-5 h-0.5 bg-gray-600 transition-all origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-gray-600 transition-all ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-gray-600 transition-all origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                  <GridIcon className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="font-bold text-gray-900">Booking</span>
              </div>
              <button onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {/* Dashboard */}
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard") ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}>
                <GridIcon className="w-4 h-4" />
                Dashboard
              </Link>

              {/* Kendaraan section */}
              <div className="pt-2">
                <div className="flex items-center gap-2 px-3 pb-1.5">
                  <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
                    <CarIcon className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Kendaraan</span>
                </div>
                <div className="space-y-0.5">
                  {carItems.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 pl-10 pr-3 py-2 rounded-xl text-sm transition-colors ${
                        isActive(item.href) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-blue-50/50 hover:text-blue-700"
                      }`}>
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/bookings/new" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 pl-10 pr-3 py-2 rounded-xl text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors">
                    <span>+ Booking Baru</span>
                  </Link>
                </div>
              </div>

              {/* Meeting Room section */}
              <div className="pt-2">
                <div className="flex items-center gap-2 px-3 pb-1.5">
                  <div className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center">
                    <RoomIcon className="w-3 h-3 text-purple-600" />
                  </div>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Meeting Room</span>
                </div>
                <div className="space-y-0.5">
                  {meetingItems.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 pl-10 pr-3 py-2 rounded-xl text-sm transition-colors ${
                        isActive(item.href) ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-600 hover:bg-purple-50/50 hover:text-purple-700"
                      }`}>
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/meeting-bookings/new" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 pl-10 pr-3 py-2 rounded-xl text-sm text-purple-600 font-semibold hover:bg-purple-50 transition-colors">
                    <span>+ Booking Baru</span>
                  </Link>
                </div>
              </div>

              {/* Admin section */}
              {role === "ADMIN" && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 px-3 pb-1.5">
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Admin</span>
                  </div>
                  <div className="space-y-0.5">
                    {adminItems.map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        className={`flex items-center px-3 py-2 rounded-xl text-sm transition-colors ${
                          isActive(item.href) ? "bg-orange-50 text-orange-700 font-medium" : "text-gray-600 hover:bg-orange-50/50 hover:text-orange-700"
                        }`}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400">{role}</p>
                </div>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full text-left text-sm text-red-500 hover:text-red-600 font-medium py-1.5 transition-colors">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
