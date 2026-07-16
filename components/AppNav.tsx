"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard",        label: "Dashboard"         },
  { href: "/bookings",         label: "Kendaraan"         },
  { href: "/calendar",         label: "Kalender Kendaraan"},
  { href: "/meeting-bookings", label: "Meeting Room"      },
  { href: "/meeting-calendar", label: "Kalender Meeting"  },
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
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        {/* Logo */}
        <Link href="/dashboard" className="font-bold text-blue-600 text-lg shrink-0">
          Booking
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1 px-4">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
              }`}>
              {item.label}
            </Link>
          ))}
          {role === "ADMIN" && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
              <span className="text-xs text-gray-400 mr-1">Admin:</span>
              {adminItems.map(item => (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive(item.href) ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link href="/bookings/new"
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Kendaraan
          </Link>
          <Link href="/meeting-bookings/new"
            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            + Ruangan
          </Link>
          <span className="text-sm text-gray-600">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            Keluar
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Menu">
          <div className="w-5 h-4 flex flex-col justify-between">
            <span className={`block h-0.5 bg-gray-600 transition-transform ${open ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block h-0.5 bg-gray-600 transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 bg-gray-600 transition-transform ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-blue-600">Booking</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                  }`}>
                  {item.label}
                </Link>
              ))}

              <div className="flex gap-2 pt-2">
                <Link href="/bookings/new" onClick={() => setOpen(false)}
                  className="flex-1 text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  + Kendaraan
                </Link>
                <Link href="/meeting-bookings/new" onClick={() => setOpen(false)}
                  className="flex-1 text-center bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
                  + Ruangan
                </Link>
              </div>

              {role === "ADMIN" && (
                <div className="pt-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-3 mb-2">Admin</p>
                  {adminItems.map(item => (
                    <Link key={item.href} href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href) ? "bg-orange-50 text-orange-700" : "text-gray-700 hover:bg-gray-100"
                      }`}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">{session?.user?.name} · {role}</p>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full text-left text-sm text-red-600 hover:text-red-700 font-medium py-2">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
