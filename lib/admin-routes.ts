export type AdminSection = "Dashboard" | "Reports" | "Stores" | "Staff QR" | "Settings";

export const ADMIN_NAV: {
  section: AdminSection;
  slug: string;
  label: string;
}[] = [
  { section: "Dashboard", slug: "dashboard", label: "Dashboard" },
  { section: "Reports", slug: "reports", label: "Reports" },
  { section: "Stores", slug: "stores", label: "Stores" },
  { section: "Staff QR", slug: "staff-qr", label: "Staff QR" },
  { section: "Settings", slug: "settings", label: "Settings" },
];

const slugToSection = new Map(ADMIN_NAV.map((item) => [item.slug, item.section]));

export function isAdminSectionSlug(slug: string) {
  return slugToSection.has(slug);
}

export function getAdminSectionFromSlug(slug: string): AdminSection | null {
  return slugToSection.get(slug) ?? null;
}

export function getAdminPath(section: AdminSection) {
  const slug = ADMIN_NAV.find((item) => item.section === section)?.slug;
  return slug ? `/admin/${slug}` : "/admin/dashboard";
}
