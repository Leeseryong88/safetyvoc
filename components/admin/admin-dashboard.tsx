"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { StaffQrSection } from "@/components/admin/staff-qr-section";
import { logOut } from "@/lib/auth";
import {
  ADMIN_NAV,
  getAdminSectionFromSlug,
  type AdminSection,
} from "@/lib/admin-routes";
import {
  brandNodeKey,
  cityNodeKey,
  countryNodeKey,
  pathForStore,
  persistLastStoreDraft,
  readLastStoreDraft,
  reorderBrand,
  sortByBrandOrder,
  sortByDescendingCount,
  buildCountMap,
  statusClass,
  todayStamp,
  unique,
} from "@/lib/store-hub-utils";
import type {
  QrCode,
  ReportInput,
  ReportItem,
  ReportStatus,
  Store,
  StoreInput,
  StoreStatus,
  Urgency,
} from "@/lib/types";
import { useAuth } from "@/lib/use-auth";
import { useStoreHubData } from "@/lib/use-store-hub-data";

export function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isLoading: authLoading } = useAuth();
  const ownerId = user?.uid ?? null;
  const currentSlug = pathname.split("/").pop() ?? "dashboard";
  const section = getAdminSectionFromSlug(currentSlug) ?? "Dashboard";
  const {
    stores,
    reports,
    qrCodes,
    brandOrder,
    isLoading,
    error,
    saveStore,
    removeStore,
    setStoreStatus,
    submitReport,
    setReportStatus,
    removeReport,
    addQrCode,
    removeQrCode,
    setBrandOrder,
  } = useStoreHubData(ownerId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, router, user]);

  async function handleLogout() {
    await logOut();
    router.replace("/");
  }

  if (authLoading || !user) {
    return (
      <main className="store-hub-app">
        <p className="data-status">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="store-hub-app">
      <header className="app-topbar">
        <div className="brand-mark">
          <div>
            <p>STORE VOC</p>
            <span>스토어 의견청취</span>
          </div>
        </div>

        <div className="admin-user-bar">
          <span>{profile?.displayName ?? user.email}</span>
          <button className="ghost-button" onClick={() => void handleLogout()} type="button">
            로그아웃
          </button>
        </div>
      </header>

      {error && (
        <p className="data-status error" role="alert">
          Firebase connection error: {error}
        </p>
      )}

      {isLoading ? (
        <p className="data-status">Loading store data...</p>
      ) : (
        <AdminExperience
          onAddQrCode={addQrCode}
          onDeleteReport={removeReport}
          onDeleteStore={removeStore}
          onRemoveQrCode={removeQrCode}
          onSaveStore={saveStore}
          onSetBrandOrder={setBrandOrder}
          onSetReportStatus={setReportStatus}
          onSetStoreStatus={setStoreStatus}
          onSubmitReport={submitReport}
          brandOrder={brandOrder}
          ownerId={ownerId}
          qrCodes={qrCodes}
          reports={reports}
          section={section}
          stores={stores}
        />
      )}
    </main>
  );
}

function AdminExperience({
  onAddQrCode,
  onDeleteReport,
  onDeleteStore,
  onRemoveQrCode,
  onSaveStore,
  onSetBrandOrder,
  onSetReportStatus,
  onSetStoreStatus,
  onSubmitReport,
  brandOrder,
  ownerId,
  qrCodes,
  reports,
  section,
  stores,
}: {
  onAddQrCode: () => Promise<string>;
  onDeleteReport: (reportId: string) => Promise<void>;
  onDeleteStore: (storeId: string) => Promise<void>;
  onRemoveQrCode: (token: string) => Promise<void>;
  onSaveStore: (storeId: string | null, input: StoreInput) => Promise<string>;
  onSetBrandOrder: (brandOrder: string[]) => Promise<void>;
  onSetReportStatus: (reportId: string, status: ReportStatus) => Promise<void>;
  onSetStoreStatus: (store: Store) => Promise<void>;
  onSubmitReport: (store: Store, input: ReportInput) => Promise<string>;
  brandOrder: string[];
  ownerId: string;
  qrCodes: QrCode[];
  reports: ReportItem[];
  section: AdminSection;
  stores: Store[];
}) {
  const [storeFilters, setStoreFilters] = useState({
    brand: "All",
    country: "All",
    city: "All",
    query: "",
  });
  const [expandedStoreNodes, setExpandedStoreNodes] = useState<Set<string>>(
    () => new Set(),
  );
  const [reportFilters, setReportFilters] = useState({
    brand: "All",
    country: "All",
    city: "All",
    storeId: "All",
    type: "All",
    urgency: "All",
    status: "All",
    from: "",
    to: "",
  });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeModalKey, setStoreModalKey] = useState(0);
  const [storeSaveError, setStoreSaveError] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeForm, setStoreForm] = useState({
    brand: "",
    country: "",
    city: "",
    name: "",
    status: "Active" as StoreStatus,
  });
  const [settings, setSettings] = useState({
    photoOptional: true,
    safetyEscalation: true,
  });
  const [isBrandOrderEditing, setIsBrandOrderEditing] = useState(false);

  const reportsWithStore = useMemo(
    () =>
      reports.map((report) => ({
        report,
        store: stores.find((store) => store.id === report.storeId),
      })),
    [reports, stores],
  );
  const selectedReport = reportsWithStore.find(
    (item) => item.report.id === selectedReportId,
  );
  const selectedReportPhotos = selectedReport
    ? selectedReport.report.photoUrls?.length
      ? selectedReport.report.photoUrls
      : selectedReport.report.photoUrl
        ? [selectedReport.report.photoUrl]
        : []
    : [];
  const filteredStores = useMemo(
    () =>
      stores.filter((store) => {
        const matchesBrand =
          storeFilters.brand === "All" || store.brand === storeFilters.brand;
        const matchesCountry =
          storeFilters.country === "All" || store.country === storeFilters.country;
        const matchesCity =
          storeFilters.city === "All" || store.city === storeFilters.city;
        const query = storeFilters.query.toLowerCase().trim();
        const matchesQuery =
          !query ||
          pathForStore(store).toLowerCase().includes(query) ||
          store.name.toLowerCase().includes(query);

        return matchesBrand && matchesCountry && matchesCity && matchesQuery;
      }),
    [storeFilters, stores],
  );
  const storeHierarchy = useMemo(() => {
    const brandMap = new Map<string, Map<string, Map<string, Store[]>>>();

    for (const store of filteredStores) {
      if (!brandMap.has(store.brand)) {
        brandMap.set(store.brand, new Map());
      }
      const countryMap = brandMap.get(store.brand)!;
      if (!countryMap.has(store.country)) {
        countryMap.set(store.country, new Map());
      }
      const cityMap = countryMap.get(store.country)!;
      if (!cityMap.has(store.city)) {
        cityMap.set(store.city, []);
      }
      cityMap.get(store.city)!.push(store);
    }

    return sortByBrandOrder(
      Array.from(brandMap.entries()).map(([brand]) => brand),
      brandOrder,
    ).map((brand) => {
      const countryMap = brandMap.get(brand)!;

      return {
        brand,
        countries: Array.from(countryMap.entries())
          .map(([country, cityMap]) => ({
            country,
            cityMap,
            storeCount: Array.from(cityMap.values()).reduce(
              (sum, cityStores) => sum + cityStores.length,
              0,
            ),
          }))
          .sort((a, b) => {
            const countDiff = b.storeCount - a.storeCount;
            if (countDiff !== 0) {
              return countDiff;
            }

            return a.country.localeCompare(b.country);
          })
          .map(({ country, cityMap }) => ({
            country,
            cities: Array.from(cityMap.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([city, cityStores]) => ({
                city,
                stores: cityStores.sort((a, b) => a.name.localeCompare(b.name)),
              })),
          })),
      };
    });
  }, [brandOrder, filteredStores]);

  useEffect(() => {
    if (
      storeFilters.brand === "All" &&
      storeFilters.country === "All" &&
      storeFilters.city === "All"
    ) {
      return;
    }

    setExpandedStoreNodes((prev) => {
      const next = new Set(prev);

      for (const store of filteredStores) {
        if (storeFilters.brand !== "All") {
          next.add(brandNodeKey(store.brand));
        }
        if (storeFilters.country !== "All") {
          next.add(brandNodeKey(store.brand));
          next.add(countryNodeKey(store.brand, store.country));
        }
        if (storeFilters.city !== "All") {
          next.add(brandNodeKey(store.brand));
          next.add(countryNodeKey(store.brand, store.country));
          next.add(cityNodeKey(store.brand, store.country, store.city));
        }
      }

      return next;
    });
  }, [storeFilters.brand, storeFilters.country, storeFilters.city, filteredStores]);

  function toggleStoreNode(key: string) {
    setExpandedStoreNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }
  const filteredReports = useMemo(
    () =>
      reportsWithStore.filter(({ report, store }) => {
        const matchesBrand =
          reportFilters.brand === "All" || store?.brand === reportFilters.brand;
        const matchesCountry =
          reportFilters.country === "All" || store?.country === reportFilters.country;
        const matchesCity =
          reportFilters.city === "All" || store?.city === reportFilters.city;
        const matchesStore =
          reportFilters.storeId === "All" || report.storeId === reportFilters.storeId;
        const matchesType =
          reportFilters.type === "All" || report.type === reportFilters.type;
        const matchesUrgency =
          reportFilters.urgency === "All" || report.urgency === reportFilters.urgency;
        const matchesStatus =
          reportFilters.status === "All" || report.status === reportFilters.status;
        const matchesFrom =
          !reportFilters.from || report.receivedAt >= reportFilters.from;
        const matchesTo = !reportFilters.to || report.receivedAt <= reportFilters.to;

        return (
          matchesBrand &&
          matchesCountry &&
          matchesCity &&
          matchesStore &&
          matchesType &&
          matchesUrgency &&
          matchesStatus &&
          matchesFrom &&
          matchesTo
        );
      }),
    [reportFilters, reportsWithStore],
  );

  const openReports = reports.filter((report) => report.status !== "Resolved").length;
  const safetyReports = reports.filter(
    (report) => report.type === "Safety" && report.status !== "Resolved",
  ).length;
  const activeStores = stores.filter((store) => store.status === "Active").length;
  const storeBrands = useMemo(
    () => sortByBrandOrder(stores.map((store) => store.brand), brandOrder),
    [brandOrder, stores],
  );
  const allStoreBrands = useMemo(
    () => sortByBrandOrder(stores.map((store) => store.brand), brandOrder),
    [brandOrder, stores],
  );
  const canReorderBrands =
    storeFilters.brand === "All" &&
    storeFilters.country === "All" &&
    storeFilters.city === "All" &&
    !storeFilters.query.trim() &&
    allStoreBrands.length > 1;
  const storeCountries = unique(stores.map((store) => store.country));
  const storeCities = unique(stores.map((store) => store.city));
  const storeFormCountries = useMemo(() => {
    const scoped = storeForm.brand.trim()
      ? stores.filter((store) => store.brand === storeForm.brand.trim())
      : stores;

    return unique(scoped.map((store) => store.country));
  }, [storeForm.brand, stores]);
  const storeFormCities = useMemo(() => {
    if (!storeForm.country.trim()) {
      return [];
    }

    const scoped = stores.filter((store) => {
      if (store.country !== storeForm.country.trim()) {
        return false;
      }

      if (storeForm.brand.trim() && store.brand !== storeForm.brand.trim()) {
        return false;
      }

      return true;
    });

    return unique(scoped.map((store) => store.city));
  }, [storeForm.brand, storeForm.country, stores]);

  function moveBrand(brand: string, direction: -1 | 1) {
    const nextOrder = reorderBrand(allStoreBrands, brandOrder, brand, direction);
    void onSetBrandOrder(nextOrder);
  }

  useEffect(() => {
    if (!canReorderBrands) {
      setIsBrandOrderEditing(false);
    }
  }, [canReorderBrands]);

  function openAddStore() {
    const lastDraft = readLastStoreDraft(ownerId);

    setEditingStoreId(null);
    setStoreSaveError(null);
    setStoreForm({
      brand: lastDraft?.brand ?? "",
      country: lastDraft?.country ?? "",
      city: lastDraft?.city ?? "",
      name: "",
      status: lastDraft?.status ?? "Active",
    });
    setStoreModalKey((key) => key + 1);
    setIsStoreModalOpen(true);
  }

  function openEditStore(store: Store) {
    setEditingStoreId(store.id);
    setStoreSaveError(null);
    setStoreForm({
      brand: store.brand,
      country: store.country,
      city: store.city,
      name: store.name,
      status: store.status,
    });
    setStoreModalKey((key) => key + 1);
    setIsStoreModalOpen(true);
  }

  function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStoreSaveError(null);

    if (
      !storeForm.brand.trim() ||
      !storeForm.country.trim() ||
      !storeForm.city.trim() ||
      !storeForm.name.trim()
    ) {
      setStoreSaveError("Brand, Country, City, and Store Name are required.");
      return;
    }

    void onSaveStore(editingStoreId, {
      brand: storeForm.brand.trim(),
      country: storeForm.country.trim(),
      city: storeForm.city.trim(),
      name: storeForm.name.trim(),
      status: storeForm.status,
    })
      .then(() => {
        persistLastStoreDraft(ownerId, {
          brand: storeForm.brand.trim(),
          country: storeForm.country.trim(),
          city: storeForm.city.trim(),
          status: storeForm.status,
        });
        setIsStoreModalOpen(false);
        setStoreSaveError(null);
      })
      .catch((error) => {
        setStoreSaveError(
          error instanceof Error ? error.message : "Failed to save store.",
        );
      });
  }

  function toggleStoreStatus(store: Store) {
    void onSetStoreStatus(store);
  }

  function deleteStore(store: Store) {
    const confirmed = window.confirm(
      `Delete "${store.name}"?\n\nThis store will be removed from the directory. Existing reports linked to this store will remain.`,
    );

    if (!confirmed) {
      return;
    }

    void onDeleteStore(store.id).then(() => {
      if (editingStoreId === store.id) {
        setEditingStoreId(null);
        setIsStoreModalOpen(false);
      }

      if (reportFilters.storeId === store.id) {
        setReportFilters((filters) => ({ ...filters, storeId: "All" }));
      }
    });
  }

  function updateReportStatus(reportId: string, status: ReportStatus) {
    void onSetReportStatus(reportId, status);
  }

  function deleteReport(reportId: string) {
    const confirmed = window.confirm(
      `Delete report "${reportId}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    void onDeleteReport(reportId).then(() => {
      setSelectedReportId(null);
    });
  }

  return (
    <section className="admin-shell" aria-label="HQ admin dashboard">
      <aside className="admin-sidebar">
        <div className="sidebar-title">
          <span>Admin</span>
          <strong>My Store</strong>
        </div>
        <nav>
          {ADMIN_NAV.map((item) => (
            <Link
              className={section === item.section ? "active" : ""}
              href={`/admin/${item.slug}`}
              key={item.slug}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-content">
        {section === "Dashboard" && (
          <div className="admin-view">
            <div className="view-heading">
              <div>
                <p>Dashboard</p>
                <h1>Store VOC Overview</h1>
              </div>
              <span className="timestamp">Updated {todayStamp()}</span>
            </div>

            <div className="metric-grid">
              <MetricCard label="Open reports" value={openReports.toString()} />
              <MetricCard label="Safety issues" tone="danger" value={safetyReports.toString()} />
              <MetricCard label="Active stores" value={activeStores.toString()} />
              <MetricCard label="Countries" value={storeCountries.length.toString()} />
            </div>

            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent Reports</h2>
                </div>
                <ReportTable
                  items={reportsWithStore.slice(0, 5)}
                  onSelect={(reportId) => setSelectedReportId(reportId)}
                />
              </section>

              <section className="panel signal-panel">
                <div className="panel-heading">
                  <h2>Country Signal</h2>
                </div>
                {storeCountries.map((country) => {
                  const count = reportsWithStore.filter(
                    ({ store, report }) =>
                      store?.country === country && report.status !== "Resolved",
                  ).length;
                  return (
                    <div className="signal-row" key={country}>
                      <span>{country}</span>
                      <div>
                        <i style={{ width: `${Math.max(12, count * 28)}px` }} />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </section>
            </div>
          </div>
        )}

        {section === "Reports" && (
          <div className="admin-view">
            <div className="view-heading">
              <div>
                <p>Reports</p>
                <h1>VOC Management</h1>
              </div>
            </div>

            <section className="filter-bar report-filter">
              <SelectControl
                label="Brand"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, brand: value }))}
                options={["All", ...storeBrands]}
                value={reportFilters.brand}
              />
              <SelectControl
                label="Country"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, country: value }))}
                options={["All", ...storeCountries]}
                value={reportFilters.country}
              />
              <SelectControl
                label="City"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, city: value }))}
                options={["All", ...storeCities]}
                value={reportFilters.city}
              />
              <SelectControl
                label="Store"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, storeId: value }))}
                options={["All", ...stores.map((store) => store.id)]}
                renderOption={(value) =>
                  value === "All" ? "All" : stores.find((store) => store.id === value)?.name ?? value
                }
                value={reportFilters.storeId}
              />
              <SelectControl
                label="Type"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, type: value }))}
                options={["All", "Safety"]}
                value={reportFilters.type}
              />
              <SelectControl
                label="Urgency"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, urgency: value }))}
                options={["All", "Critical", "High", "Normal", "Low"]}
                value={reportFilters.urgency}
              />
              <SelectControl
                label="Status"
                onChange={(value) => setReportFilters((filters) => ({ ...filters, status: value }))}
                options={["All", "New", "In Review", "Resolved"]}
                value={reportFilters.status}
              />
              <label className="field-control">
                <span>From</span>
                <input
                  onChange={(event) =>
                    setReportFilters((filters) => ({ ...filters, from: event.target.value }))
                  }
                  type="date"
                  value={reportFilters.from}
                />
              </label>
              <label className="field-control">
                <span>To</span>
                <input
                  onChange={(event) =>
                    setReportFilters((filters) => ({ ...filters, to: event.target.value }))
                  }
                  type="date"
                  value={reportFilters.to}
                />
              </label>
            </section>

            <section className="panel">
              <ReportTable items={filteredReports} onSelect={(reportId) => setSelectedReportId(reportId)} />
            </section>
          </div>
        )}

        {section === "Stores" && (
          <div className="admin-view">
            <div className="view-heading with-action">
              <div>
                <p>Stores</p>
                <h1>Store Directory</h1>
              </div>
              <div className="heading-actions">
                {canReorderBrands && (
                  <button
                    className={isBrandOrderEditing ? "primary-button" : "ghost-button"}
                    onClick={() => setIsBrandOrderEditing((editing) => !editing)}
                    type="button"
                  >
                    {isBrandOrderEditing ? "Done" : "Reorder brands"}
                  </button>
                )}
                <button className="primary-button" onClick={openAddStore} type="button">
                  Add Store
                </button>
              </div>
            </div>

            <section className="filter-bar">
              <SelectControl
                label="Brand"
                onChange={(value) => setStoreFilters((filters) => ({ ...filters, brand: value }))}
                options={["All", ...storeBrands]}
                value={storeFilters.brand}
              />
              <SelectControl
                label="Country"
                onChange={(value) => setStoreFilters((filters) => ({ ...filters, country: value }))}
                options={["All", ...storeCountries]}
                value={storeFilters.country}
              />
              <SelectControl
                label="City"
                onChange={(value) => setStoreFilters((filters) => ({ ...filters, city: value }))}
                options={["All", ...storeCities]}
                value={storeFilters.city}
              />
              <label className="field-control search-field">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setStoreFilters((filters) => ({ ...filters, query: event.target.value }))
                  }
                  placeholder="Store, city, country"
                  type="search"
                  value={storeFilters.query}
                />
              </label>
            </section>

            <section className="panel">
              {storeHierarchy.length === 0 ? (
                <p className="empty-message">No stores match the current filters.</p>
              ) : (
                <div className="store-tree">
                  {storeHierarchy.map((brandNode, brandIndex) => {
                    const brandKey = brandNodeKey(brandNode.brand);
                    const brandOpen = expandedStoreNodes.has(brandKey);
                    const brandStoreCount = brandNode.countries.reduce(
                      (sum, countryNode) =>
                        sum +
                        countryNode.cities.reduce(
                          (citySum, cityNode) => citySum + cityNode.stores.length,
                          0,
                        ),
                      0,
                    );

                    return (
                      <div className="tree-branch" key={brandKey}>
                        <div className="tree-row level-brand">
                          {isBrandOrderEditing && canReorderBrands && (
                            <div className="tree-reorder">
                              <button
                                aria-label={`Move ${brandNode.brand} up`}
                                className="tree-reorder-button"
                                disabled={brandIndex === 0}
                                onClick={() => moveBrand(brandNode.brand, -1)}
                                type="button"
                              >
                                ↑
                              </button>
                              <button
                                aria-label={`Move ${brandNode.brand} down`}
                                className="tree-reorder-button"
                                disabled={brandIndex === storeHierarchy.length - 1}
                                onClick={() => moveBrand(brandNode.brand, 1)}
                                type="button"
                              >
                                ↓
                              </button>
                            </div>
                          )}
                          <button
                            aria-expanded={brandOpen}
                            className="tree-row-toggle"
                            onClick={() => toggleStoreNode(brandKey)}
                            type="button"
                          >
                            <span className={brandOpen ? "tree-caret open" : "tree-caret"}>
                              ▶
                            </span>
                            <span className="tree-label">{brandNode.brand}</span>
                            <span className="tree-count">{brandStoreCount} stores</span>
                          </button>
                        </div>

                        {brandOpen &&
                          brandNode.countries.map((countryNode) => {
                            const countryKey = countryNodeKey(
                              brandNode.brand,
                              countryNode.country,
                            );
                            const countryOpen = expandedStoreNodes.has(countryKey);
                            const countryStoreCount = countryNode.cities.reduce(
                              (sum, cityNode) => sum + cityNode.stores.length,
                              0,
                            );

                            return (
                              <div className="tree-branch" key={countryKey}>
                                <button
                                  aria-expanded={countryOpen}
                                  className="tree-row level-country"
                                  onClick={() => toggleStoreNode(countryKey)}
                                  type="button"
                                >
                                  <span
                                    className={
                                      countryOpen ? "tree-caret open" : "tree-caret"
                                    }
                                  >
                                    ▶
                                  </span>
                                  <span className="tree-label">{countryNode.country}</span>
                                  <span className="tree-count">
                                    {countryStoreCount} stores
                                  </span>
                                </button>

                                {countryOpen &&
                                  countryNode.cities.map((cityNode) => {
                                    const cityKey = cityNodeKey(
                                      brandNode.brand,
                                      countryNode.country,
                                      cityNode.city,
                                    );
                                    const cityOpen = expandedStoreNodes.has(cityKey);

                                    return (
                                      <div className="tree-branch" key={cityKey}>
                                        <button
                                          aria-expanded={cityOpen}
                                          className="tree-row level-city"
                                          onClick={() => toggleStoreNode(cityKey)}
                                          type="button"
                                        >
                                          <span
                                            className={
                                              cityOpen ? "tree-caret open" : "tree-caret"
                                            }
                                          >
                                            ▶
                                          </span>
                                          <span className="tree-label">{cityNode.city}</span>
                                          <span className="tree-count">
                                            {cityNode.stores.length} stores
                                          </span>
                                        </button>

                                        {cityOpen &&
                                          cityNode.stores.map((store) => (
                                            <div
                                              className={
                                                store.status === "Inactive"
                                                  ? "tree-store muted-row"
                                                  : "tree-store"
                                              }
                                              key={store.id}
                                            >
                                              <div className="tree-store-info">
                                                <strong>{store.name}</strong>
                                                <Badge value={store.status} />
                                              </div>
                                              <div className="row-actions">
                                                <button
                                                  onClick={() => openEditStore(store)}
                                                  type="button"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => toggleStoreStatus(store)}
                                                  type="button"
                                                >
                                                  {store.status === "Active"
                                                    ? "Deactivate"
                                                    : "Activate"}
                                                </button>
                                                <button
                                                  className="danger-button"
                                                  onClick={() => deleteStore(store)}
                                                  type="button"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    );
                                  })}
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {section === "Staff QR" && (
          <StaffQrSection
            brandOrder={brandOrder}
            onAddQrCode={onAddQrCode}
            onCreateReport={onSubmitReport}
            onRemoveQrCode={onRemoveQrCode}
            qrCodes={qrCodes}
            stores={stores}
          />
        )}

        {section === "Settings" && (
          <div className="admin-view">
            <div className="view-heading">
              <div>
                <p>Settings</p>
                <h1>System Settings</h1>
              </div>
            </div>

            <div className="settings-grid">
              <ToggleCard
                checked={settings.photoOptional}
                description="Allow staff to submit a report without a photo."
                label="Photo optional"
                onChange={(checked) => setSettings((value) => ({ ...value, photoOptional: checked }))}
              />
              <ToggleCard
                checked={settings.safetyEscalation}
                description="Mark safety reports as high urgency by default."
                label="Safety escalation"
                onChange={(checked) => setSettings((value) => ({ ...value, safetyEscalation: checked }))}
              />
            </div>
          </div>
        )}
      </div>

      {selectedReport && (
        <div
          className="modal-backdrop report-detail-backdrop"
          onClick={() => setSelectedReportId(null)}
          role="presentation"
        >
          <article
            aria-label="접수 상세"
            aria-modal="true"
            className="report-detail-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="report-detail-heading">
              <div>
                <p className="report-detail-id">{selectedReport.report.id}</p>
                <h2>접수 상세</h2>
              </div>
              <button
                className="ghost-button"
                onClick={() => setSelectedReportId(null)}
                type="button"
              >
                닫기
              </button>
            </div>

            <div className="report-detail-meta">
              <span className="report-detail-store">{pathForStore(selectedReport.store)}</span>
              <div className="report-detail-badges">
                <span className="badge">
                  {selectedReport.report.type === "Safety" ? "안전관리" : selectedReport.report.type}
                </span>
                <Badge value={selectedReport.report.urgency} />
                <Badge value={selectedReport.report.status} />
              </div>
              <span className="report-detail-date">{selectedReport.report.receivedAt}</span>
            </div>

            <section className="report-detail-block">
              <h3>접수자</h3>
              <p className="report-detail-reporter">{selectedReport.report.reporter || "-"}</p>
            </section>

            <section className="report-detail-block">
              <h3>내용</h3>
              <p className="report-detail-content">{selectedReport.report.content}</p>
            </section>

            <section className="report-detail-block">
              <h3>
                사진
                {selectedReportPhotos.length > 0 ? ` (${selectedReportPhotos.length})` : ""}
              </h3>
              {selectedReportPhotos.length > 0 ? (
                <div className="report-detail-photo-grid">
                  {selectedReportPhotos.map((url, index) => (
                    <a
                      className="report-detail-photo-link"
                      href={url}
                      key={`${url}-${index}`}
                      rel="noreferrer"
                      target="_blank"
                      title="새 탭에서 크게 보기"
                    >
                      <img
                        alt={
                          selectedReport.report.photoName
                            ? `${selectedReport.report.photoName} (${index + 1})`
                            : `접수 사진 ${index + 1}`
                        }
                        className="report-detail-photo"
                        src={url}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="photo-placeholder">
                  {selectedReport.report.photoName ?? "첨부된 사진 없음"}
                </div>
              )}
            </section>

            <div className="report-detail-actions">
              <label className="field-control">
                <span>상태</span>
                <select
                  onChange={(event) =>
                    updateReportStatus(
                      selectedReport.report.id,
                      event.target.value as ReportStatus,
                    )
                  }
                  value={selectedReport.report.status}
                >
                  <option value="New">New</option>
                  <option value="In Review">In Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </label>
              <button
                className="danger-button"
                onClick={() => deleteReport(selectedReport.report.id)}
                type="button"
              >
                삭제
              </button>
            </div>
          </article>
        </div>
      )}

      {isStoreModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-sheet" onSubmit={saveStore}>
            <div className="modal-heading">
              <h2>{editingStoreId ? "Edit Store" : "Add Store"}</h2>
              <button onClick={() => setIsStoreModalOpen(false)} type="button">
                Close
              </button>
            </div>
            <SelectOrInputControl
              addNewLabel="Add new brand..."
              inputPlaceholder="Enter brand name"
              label="Brand"
              onChange={(value) =>
                setStoreForm((form) => ({ ...form, brand: value, country: "", city: "" }))
              }
              options={storeBrands}
              resetKey={`${storeModalKey}-${editingStoreId ?? "new"}`}
              value={storeForm.brand}
            />
            <SelectOrInputControl
              addNewLabel="Add new country..."
              inputPlaceholder="Enter country name"
              label="Country"
              onChange={(value) => setStoreForm((form) => ({ ...form, country: value, city: "" }))}
              options={storeFormCountries}
              resetKey={`${storeModalKey}-${editingStoreId ?? "new"}-${storeForm.brand}`}
              value={storeForm.country}
            />
            <SelectOrInputControl
              addNewLabel="Add new city..."
              disabled={!storeForm.country.trim()}
              disabledHint="Select country first..."
              inputPlaceholder="Enter city name"
              label="City"
              onChange={(value) => setStoreForm((form) => ({ ...form, city: value }))}
              options={storeFormCities}
              resetKey={`${storeModalKey}-${editingStoreId ?? "new"}-${storeForm.brand}-${storeForm.country}`}
              value={storeForm.city}
            />
            <label className="field-control">
              <span>Store Name</span>
              <input
                onChange={(event) => setStoreForm((form) => ({ ...form, name: event.target.value }))}
                required
                value={storeForm.name}
              />
            </label>
            <SelectControl
              label="Status"
              onChange={(value) => setStoreForm((form) => ({ ...form, status: value as StoreStatus }))}
              options={["Active", "Inactive"]}
              value={storeForm.status}
            />
            <div className="modal-actions">
              {storeSaveError && (
                <p className="auth-error modal-save-error" role="alert">
                  {storeSaveError}
                </p>
              )}
              <button className="ghost-button" onClick={() => setIsStoreModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

    </section>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger";
  value: string;
}) {
  return (
    <article className={tone === "danger" ? "metric-card danger" : "metric-card"}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Badge({ value }: { value: StoreStatus | ReportStatus | Urgency }) {
  return <span className={`badge ${statusClass(value)}`}>{value}</span>;
}

function SelectControl({
  label,
  onChange,
  options,
  renderOption,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  renderOption?: (value: string) => string;
  value: string;
}) {
  return (
    <label className="field-control">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {renderOption ? renderOption(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectOrInputControl({
  addNewLabel = "Add new...",
  disabled = false,
  disabledHint,
  inputPlaceholder,
  label,
  onChange,
  options,
  resetKey,
  value,
}: {
  addNewLabel?: string;
  disabled?: boolean;
  disabledHint?: string;
  inputPlaceholder?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  resetKey?: string;
  value: string;
}) {
  const knownOptions = useMemo(() => unique([...options]), [options]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"select" | "custom">(() =>
    options.length === 0 ? "custom" : "select",
  );

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (comboboxRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [resetKey]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    if (knownOptions.length === 0) {
      setMode("custom");
      return;
    }

    if (value && knownOptions.includes(value)) {
      setMode("select");
      return;
    }

    if (value && !knownOptions.includes(value)) {
      setMode("custom");
    }
  }, [disabled, knownOptions, value]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    if (knownOptions.length === 0) {
      setMode("custom");
      return;
    }

    if (value && !knownOptions.includes(value)) {
      setMode("custom");
      return;
    }

    setMode("select");
  }, [disabled, resetKey]);

  function enterCustomMode() {
    setIsMenuOpen(false);
    setMode("custom");
    onChange("");
  }

  function chooseOption(option: string) {
    setIsMenuOpen(false);
    onChange(option);
  }

  if (disabled) {
    return (
      <label className="field-control">
        <span>{label}</span>
        <select disabled value="">
          <option value="">{disabledHint ?? `Select ${label}...`}</option>
        </select>
      </label>
    );
  }

  if (mode === "custom") {
    return (
      <div className="field-control">
        <span>{label}</span>
        <input
          autoFocus
          onChange={(event) => onChange(event.target.value)}
          placeholder={inputPlaceholder ?? `Enter ${label}`}
          required
          value={value}
        />
        {knownOptions.length > 0 && (
          <button
            className="text-link-button"
            onClick={() => {
              setMode("select");
              onChange(knownOptions.includes(value) ? value : "");
            }}
            type="button"
          >
            Choose from existing
          </button>
        )}
      </div>
    );
  }

  const selectValue = knownOptions.includes(value) ? value : "";
  const placeholder = `Select ${label}...`;

  return (
    <div className="field-control field-combobox" ref={comboboxRef}>
      <span>{label}</span>
      <input name={`${label}-value`} readOnly required type="hidden" value={selectValue} />
      <button
        aria-expanded={isMenuOpen}
        aria-haspopup="listbox"
        className={selectValue ? "combobox-trigger" : "combobox-trigger placeholder"}
        onClick={() => setIsMenuOpen((open) => !open)}
        type="button"
      >
        <span>{selectValue || placeholder}</span>
        <span className="combobox-caret">▾</span>
      </button>
      {isMenuOpen && (
        <ul className="combobox-menu" role="listbox">
          {knownOptions.map((option) => (
            <li key={option}>
              <button
                className="combobox-option"
                onClick={() => chooseOption(option)}
                role="option"
                type="button"
              >
                {option}
              </button>
            </li>
          ))}
          <li>
            <button
              className="combobox-option add-new-option"
              onClick={enterCustomMode}
              role="option"
              type="button"
            >
              {addNewLabel}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function ReportTable({
  items,
  onSelect,
}: {
  items: { report: ReportItem; store?: Store }[];
  onSelect: (reportId: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Brand</th>
            <th>Country</th>
            <th>City</th>
            <th>Store</th>
            <th>Type</th>
            <th>Urgency</th>
            <th>Status</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ report, store }) => (
            <tr key={report.id} onClick={() => onSelect(report.id)}>
              <td>{store?.brand ?? "-"}</td>
              <td>{store?.country ?? "-"}</td>
              <td>{store?.city ?? "-"}</td>
              <td>
                <strong>{store?.name ?? "Unknown"}</strong>
                <span>{report.id}</span>
              </td>
              <td>{report.type}</td>
              <td>
                <Badge value={report.urgency} />
              </td>
              <td>
                <Badge value={report.status} />
              </td>
              <td>{report.receivedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ToggleCard({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-card">
      <span>
        <strong>{label}</strong>
        <em>{description}</em>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
