export type StoreStatus = "Active" | "Inactive";
export type ReportType = "Safety" | "General";
export type Urgency = "Critical" | "High" | "Normal" | "Low";
export type ReportStatus = "New" | "In Review" | "Resolved";

export type Store = {
  id: string;
  ownerId: string;
  brand: string;
  country: string;
  city: string;
  name: string;
  status: StoreStatus;
};

export type ReportItem = {
  id: string;
  ownerId: string;
  storeId: string;
  type: ReportType;
  urgency: Urgency;
  status: ReportStatus;
  receivedAt: string;
  content: string;
  reporter: string;
  photoName?: string;
  photoUrl?: string;
  photoUrls?: string[];
};

export type StoreInput = Omit<Store, "id" | "ownerId">;

export type ReportInput = {
  storeId: string;
  type: ReportType;
  urgency: Urgency;
  status: ReportStatus;
  content: string;
  reporter: string;
  photoName?: string;
  photoFiles?: File[];
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  storeName: string;
};

export type QrCode = {
  id: string;
  ownerId: string;
  label: string;
  active: boolean;
  createdAt: string;
};

export type TenantSettings = {
  ownerId: string;
  brandOrder: string[];
};
