"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bookings", label: "Bookings" },
];

const adminItems = [
  { href: "/admin/users",       label: "Users" },
  { href: "/admin/divisions",   label: "Divisions" },
  { href: "/admin/cars",        label: "Cars" },
  { href: "/admin/drivers",     label: "Drivers" },
  { href: "/admin/assignments", label: "Penugasan" },
];

export default function AppNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-blue-600 text-lg">CarBook</Link>
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {role === "ADMIN" && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
              <span className="text-xs text-gray-400 mr-1">Admin:</span>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href) ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/bookings/new"
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Book a Car
        </Link>
        <div className="text-sm text-gray-600 hidden md:block">
          {session?.user?.name}
          <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{role}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
