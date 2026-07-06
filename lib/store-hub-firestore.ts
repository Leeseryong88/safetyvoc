import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { uploadReportPhoto } from "./report-photo";
import type {
  QrCode,
  ReportInput,
  ReportItem,
  ReportStatus,
  Store,
  StoreInput,
  StoreStatus,
  TenantSettings,
} from "./types";

function getStoresCollection() {
  return collection(getFirebaseDb(), "stores");
}

function getReportsCollection() {
  return collection(getFirebaseDb(), "reports");
}

function getQrCodesCollection() {
  return collection(getFirebaseDb(), "qrCodes");
}

function mapStore(id: string, data: Record<string, unknown>): Store {
  return {
    id,
    ownerId: String(data.ownerId ?? ""),
    brand: String(data.brand ?? ""),
    country: String(data.country ?? ""),
    city: String(data.city ?? ""),
    name: String(data.name ?? ""),
    status: (data.status as StoreStatus) ?? "Active",
  };
}

function formatReceivedAt(value: unknown): string {
  if (typeof value === "string" && value) {
    return value.slice(0, 10);
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function mapReport(id: string, data: Record<string, unknown>): ReportItem {
  const photoUrls = Array.isArray(data.photoUrls)
    ? data.photoUrls.filter((item): item is string => typeof item === "string")
    : [];
  const photoUrl = photoUrls[0];
  const photoName = typeof data.photoName === "string" ? data.photoName : undefined;

  return {
    id,
    ownerId: String(data.ownerId ?? ""),
    storeId: String(data.storeId ?? ""),
    type: (data.type as ReportItem["type"]) ?? "General",
    urgency: (data.urgency as ReportItem["urgency"]) ?? "Normal",
    status: (data.status as ReportItem["status"]) ?? "New",
    receivedAt: formatReceivedAt(data.receivedAt ?? data.createdAt),
    content: String(data.content ?? ""),
    reporter: String(data.reporter ?? "Store staff"),
    photoName: photoName || undefined,
    photoUrl,
    photoUrls,
  };
}

function mapQrCode(id: string, data: Record<string, unknown>): QrCode {
  return {
    id,
    ownerId: String(data.ownerId ?? ""),
    label: String(data.label ?? ""),
    active: data.active !== false,
    createdAt: formatReceivedAt(data.createdAt),
  };
}

function sortStores(stores: Store[]) {
  return [...stores].sort((a, b) => {
    const brand = a.brand.localeCompare(b.brand);
    if (brand !== 0) {
      return brand;
    }

    const country = a.country.localeCompare(b.country);
    if (country !== 0) {
      return country;
    }

    const city = a.city.localeCompare(b.city);
    if (city !== 0) {
      return city;
    }

    return a.name.localeCompare(b.name);
  });
}

function sortReports(reports: ReportItem[]) {
  return [...reports].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

function sortQrCodes(qrCodes: QrCode[]) {
  return [...qrCodes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function generateQrToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function subscribeStores(
  ownerId: string,
  onData: (stores: Store[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const storesQuery = query(getStoresCollection(), where("ownerId", "==", ownerId));

  return onSnapshot(
    storesQuery,
    (snapshot) => {
      onData(sortStores(snapshot.docs.map((item) => mapStore(item.id, item.data()))));
    },
    (error) => onError(error),
  );
}

export function subscribeReports(
  ownerId: string,
  onData: (reports: ReportItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const reportsQuery = query(getReportsCollection(), where("ownerId", "==", ownerId));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      onData(sortReports(snapshot.docs.map((item) => mapReport(item.id, item.data()))));
    },
    (error) => onError(error),
  );
}

export function subscribeQrCodes(
  ownerId: string,
  onData: (qrCodes: QrCode[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const qrQuery = query(getQrCodesCollection(), where("ownerId", "==", ownerId));

  return onSnapshot(
    qrQuery,
    (snapshot) => {
      onData(sortQrCodes(snapshot.docs.map((item) => mapQrCode(item.id, item.data()))));
    },
    (error) => onError(error),
  );
}

export async function getQrCodeByToken(token: string): Promise<QrCode | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "qrCodes", token));
  if (!snapshot.exists()) {
    return null;
  }

  const qrCode = mapQrCode(snapshot.id, snapshot.data());
  if (!qrCode.active) {
    return null;
  }

  return qrCode;
}

export async function createStore(ownerId: string, input: StoreInput) {
  const now = serverTimestamp();
  const docRef = await addDoc(getStoresCollection(), {
    ...input,
    ownerId,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function updateStore(storeId: string, ownerId: string, input: StoreInput) {
  await updateDoc(doc(getFirebaseDb(), "stores", storeId), {
    ...input,
    ownerId,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStoreById(storeId: string) {
  await deleteDoc(doc(getFirebaseDb(), "stores", storeId));
}

export async function toggleStoreStatus(store: Store) {
  const nextStatus: StoreStatus = store.status === "Active" ? "Inactive" : "Active";
  await updateDoc(doc(getFirebaseDb(), "stores", store.id), {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function createReport(ownerId: string, store: Store, input: ReportInput) {
  const reportId = `VOC-${Date.now().toString().slice(-6)}`;
  const receivedAt = new Date().toISOString().slice(0, 10);
  const photoUrls: string[] = [];

  if (input.photoFiles?.length) {
    const uploaded = await Promise.all(
      input.photoFiles.map((file) => uploadReportPhoto(ownerId, reportId, file)),
    );
    photoUrls.push(...uploaded);
  }

  await setDoc(doc(getFirebaseDb(), "reports", reportId), {
    ownerId,
    storeId: input.storeId,
    brand: store.brand,
    country: store.country,
    city: store.city,
    storeName: store.name,
    type: input.type,
    urgency: input.urgency,
    status: input.status,
    content: input.content,
    reporter: input.reporter,
    photoName:
      input.photoName ??
      (input.photoFiles?.length
        ? input.photoFiles.map((file) => file.name).join(", ")
        : null),
    photoUrls,
    receivedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reportId;
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  await updateDoc(doc(getFirebaseDb(), "reports", reportId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReportById(reportId: string) {
  await deleteDoc(doc(getFirebaseDb(), "reports", reportId));
}

export async function createQrCode(ownerId: string) {
  const existing = await getDocs(
    query(getQrCodesCollection(), where("ownerId", "==", ownerId), limit(1)),
  );

  if (!existing.empty) {
    throw new Error("QR은 1개만 생성할 수 있습니다.");
  }

  const token = generateQrToken();
  const now = serverTimestamp();

  await setDoc(doc(getFirebaseDb(), "qrCodes", token), {
    ownerId,
    label: "Staff QR",
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  return token;
}

export async function deleteQrCode(token: string) {
  await deleteDoc(doc(getFirebaseDb(), "qrCodes", token));
}

export function subscribeTenantSettings(
  ownerId: string,
  onData: (settings: TenantSettings | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "tenantSettings", ownerId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      const data = snapshot.data();
      const brandOrder = Array.isArray(data.brandOrder)
        ? data.brandOrder.filter((item): item is string => typeof item === "string")
        : [];

      onData({
        ownerId,
        brandOrder,
      });
    },
    (error) => onError(error),
  );
}

export async function updateBrandOrder(ownerId: string, brandOrder: string[]) {
  await setDoc(
    doc(getFirebaseDb(), "tenantSettings", ownerId),
    {
      ownerId,
      brandOrder,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
