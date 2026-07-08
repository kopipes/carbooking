"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar",  label: "Kalender"  },
  { href: "/bookings",  label: "Booking"   },
];

const adminItems = [
  { href: "/admin/users",       label: "Users"     },
  { href: "/admin/divisions",   label: "Divisions" },
  { href: "/admin/cars",        label: "Cars"      },
  { href: "/admin/drivers",     label: "Drivers"   },
  { href: "/admin/assignments", label: "Penugasan" },
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
          CarBook
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
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
            + Book a Car
          </Link>
          <div className="text-sm text-gray-600">
            {session?.user?.name}
            <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{role}</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Sign out
          </button>
        </div>

        {/* Mobile right: book + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/bookings/new"
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
            + Booking
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{session?.user?.name}</p>
                <p className="text-xs text-gray-400">{session?.user?.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                role === "ADMIN" ? "bg-red-100 text-red-700" :
                role === "MANAGER" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>{role}</span>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto py-3">
              <div className="px-2 space-y-0.5">
                {navItems.map(item => (
                  <Link key={item.href} href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    }`}>
                    {item.label}
                  </Link>
                ))}
              </div>

              {role === "ADMIN" && (
                <div className="mt-4 px-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Admin</p>
                  <div className="space-y-0.5">
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
                </div>
              )}
            </div>

            {/* Sign out */}
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full text-left text-sm text-red-600 hover:text-red-700 font-medium py-2"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
