"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { isAdminSectionSlug } from "@/lib/admin-routes";

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const router = useRouter();
  const section = params.section;

  useEffect(() => {
    if (!isAdminSectionSlug(section)) {
      router.replace("/admin/dashboard");
    }
  }, [router, section]);

  if (!isAdminSectionSlug(section)) {
    return (
      <main className="store-hub-app">
        <p className="data-status">로딩 중...</p>
      </main>
    );
  }

  return <AdminDashboard />;
}
