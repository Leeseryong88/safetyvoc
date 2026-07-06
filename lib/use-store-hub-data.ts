"use client";

import { useEffect, useState } from "react";
import { ensureFirestoreAuth, initFirebaseAnalytics } from "./firebase";
import {
  createQrCode,
  createReport,
  createStore,
  deleteQrCode,
  deleteReportById,
  deleteStoreById,
  subscribeQrCodes,
  subscribeReports,
  subscribeStores,
  subscribeTenantSettings,
  toggleStoreStatus,
  updateBrandOrder,
  updateReportStatus,
  updateStore,
} from "./store-hub-firestore";
import type {
  QrCode,
  ReportInput,
  ReportItem,
  ReportStatus,
  Store,
  StoreInput,
} from "./types";

export function useStoreHubData(ownerId: string | null) {
  const [stores, setStores] = useState<Store[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [brandOrder, setBrandOrderState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setStores([]);
      setReports([]);
      setQrCodes([]);
      setBrandOrderState([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let unsubStores: (() => void) | undefined;
    let unsubReports: (() => void) | undefined;
    let unsubQrCodes: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;

    let storesReady = false;
    let reportsReady = false;
    let qrReady = false;
    let settingsReady = false;

    const markReady = () => {
      if (storesReady && reportsReady && qrReady && settingsReady && !cancelled) {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const user = await ensureFirestoreAuth();
        if (cancelled || user.uid !== ownerId) {
          return;
        }

        void initFirebaseAnalytics().catch(() => null);

        unsubStores = subscribeStores(
          ownerId,
          (nextStores) => {
            if (cancelled) {
              return;
            }
            setStores(nextStores);
            storesReady = true;
            markReady();
          },
          (nextError) => {
            if (cancelled) {
              return;
            }
            setError(`stores: ${nextError.message}`);
            storesReady = true;
            markReady();
          },
        );

        unsubReports = subscribeReports(
          ownerId,
          (nextReports) => {
            if (cancelled) {
              return;
            }
            setReports(nextReports);
            reportsReady = true;
            markReady();
          },
          (nextError) => {
            if (cancelled) {
              return;
            }
            setError(`reports: ${nextError.message}`);
            reportsReady = true;
            markReady();
          },
        );

        unsubQrCodes = subscribeQrCodes(
          ownerId,
          (nextQrCodes) => {
            if (cancelled) {
              return;
            }
            setQrCodes(nextQrCodes);
            qrReady = true;
            markReady();
          },
          (nextError) => {
            if (cancelled) {
              return;
            }
            setError(`qrCodes: ${nextError.message}`);
            qrReady = true;
            markReady();
          },
        );

        unsubSettings = subscribeTenantSettings(
          ownerId,
          (settings) => {
            if (cancelled) {
              return;
            }
            setBrandOrderState(settings?.brandOrder ?? []);
            settingsReady = true;
            markReady();
          },
          (nextError) => {
            if (cancelled) {
              return;
            }
            setError(`tenantSettings: ${nextError.message}`);
            settingsReady = true;
            markReady();
          },
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "인증 확인에 실패했습니다.");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubStores?.();
      unsubReports?.();
      unsubQrCodes?.();
      unsubSettings?.();
    };
  }, [ownerId]);

  async function saveStore(storeId: string | null, input: StoreInput) {
    if (!ownerId) {
      throw new Error("Owner is required.");
    }

    await ensureFirestoreAuth();

    if (storeId) {
      await updateStore(storeId, ownerId, input);
      return storeId;
    }

    return createStore(ownerId, input);
  }

  async function removeStore(storeId: string) {
    await ensureFirestoreAuth();
    await deleteStoreById(storeId);
  }

  async function setStoreStatus(store: Store) {
    await ensureFirestoreAuth();
    await toggleStoreStatus(store);
  }

  async function submitReport(store: Store, input: ReportInput) {
    if (!ownerId) {
      throw new Error("Owner is required.");
    }

    return createReport(ownerId, store, input);
  }

  async function setReportStatus(reportId: string, status: ReportStatus) {
    await ensureFirestoreAuth();
    await updateReportStatus(reportId, status);
  }

  async function removeReport(reportId: string) {
    await ensureFirestoreAuth();
    await deleteReportById(reportId);
  }

  async function addQrCode() {
    if (!ownerId) {
      throw new Error("Owner is required.");
    }

    await ensureFirestoreAuth();
    return createQrCode(ownerId);
  }

  async function removeQrCode(token: string) {
    await ensureFirestoreAuth();
    await deleteQrCode(token);
  }

  async function setBrandOrder(nextBrandOrder: string[]) {
    if (!ownerId) {
      throw new Error("Owner is required.");
    }

    await ensureFirestoreAuth();
    await updateBrandOrder(ownerId, nextBrandOrder);
  }

  return {
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
  };
}

export function usePublicStoreData(ownerId: string | null) {
  const [stores, setStores] = useState<Store[]>([]);
  const [brandOrder, setBrandOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setStores([]);
      setBrandOrder([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let unsubStores: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let storesReady = false;
    let settingsReady = false;

    const markReady = () => {
      if (storesReady && settingsReady && !cancelled) {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    setError(null);

    unsubStores = subscribeStores(
      ownerId,
      (nextStores) => {
        if (cancelled) {
          return;
        }
        setStores(nextStores);
        if (!storesReady) {
          storesReady = true;
          markReady();
        }
      },
      (nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError.message);
        if (!storesReady) {
          storesReady = true;
          markReady();
        }
      },
    );

    unsubSettings = subscribeTenantSettings(
      ownerId,
      (settings) => {
        if (cancelled) {
          return;
        }
        setBrandOrder(settings?.brandOrder ?? []);
        if (!settingsReady) {
          settingsReady = true;
          markReady();
        }
      },
      (nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError.message);
        if (!settingsReady) {
          settingsReady = true;
          markReady();
        }
      },
    );

    return () => {
      cancelled = true;
      unsubStores?.();
      unsubSettings?.();
    };
  }, [ownerId]);

  async function submitReport(store: Store, input: ReportInput) {
    if (!ownerId) {
      throw new Error("Owner is required.");
    }

    return createReport(ownerId, store, input);
  }

  return {
    stores,
    brandOrder,
    isLoading,
    error,
    submitReport,
  };
}
