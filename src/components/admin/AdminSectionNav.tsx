import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/pets", label: "Pets" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/guide", label: "Guide" },
];

export function AdminSectionNav({ currentPath }: { currentPath: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => {
        const active = currentPath === link.href || (link.href !== "/admin" && currentPath.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-white text-surface-900 shadow-sm border border-surface-200/80"
                : "text-surface-500 hover:text-surface-700 hover:bg-white/60 border border-transparent"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
