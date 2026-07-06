import type { ReportStatus, Store, StoreStatus, Urgency } from "./types";

export const MAX_REPORT_PHOTOS = 5;

export type Language = "ko" | "zh" | "en" | "ja";

export const LANGUAGE_OPTIONS: { value: Language; label: string; native: string }[] = [
  { value: "ko", label: "Korean", native: "한국어" },
  { value: "en", label: "English", native: "English" },
  { value: "zh", label: "Chinese", native: "中文" },
  { value: "ja", label: "Japanese", native: "日本語" },
];

export const staffCopy: Record<
  Language,
  {
    language: string;
    prompt: string;
    brand: string;
    country: string;
    city: string;
    store: string;
    confirm: string;
    selectedStore: string;
    changeStore: string;
    reportType: string;
    safety: string;
    safetyDesc: string;
    general: string;
    generalDesc: string;
    content: string;
    contentPlaceholder: string;
    reporter: string;
    reporterPlaceholder: string;
    photo: string;
    photoChoose: string;
    photoEmpty: string;
    photoHint: string;
    photoError: string;
    submit: string;
    completeTitle: string;
    completeText: string;
    backHome: string;
  }
> = {
  ko: {
    language: "언어",
    prompt: "제보를 등록할 스토어를 선택해주세요.",
    brand: "브랜드 선택",
    country: "국가 선택",
    city: "도시 선택",
    store: "스토어명 선택",
    confirm: "선택 완료",
    selectedStore: "선택한 스토어",
    changeStore: "스토어 변경",
    reportType: "제보 유형을 선택해주세요.",
    safety: "안전관리 제보",
    safetyDesc: "긴급 확인이 필요한 안전 이슈",
    general: "일반 제보",
    generalDesc: "운영, 시설, 고객 VOC 등",
    content: "내용",
    contentPlaceholder: "상황을 구체적으로 작성해주세요.",
    reporter: "작성자",
    reporterPlaceholder: "이름을 입력해주세요.",
    photo: "사진 첨부",
    photoChoose: "파일 선택",
    photoEmpty: "선택된 파일 없음",
    photoHint: "JPG / PNG · 최대 5장",
    photoError: "사진을 첨부하지 못했습니다.",
    submit: "제출",
    completeTitle: "제보가 접수되었습니다.",
    completeText: "관리자가 접수 내용을 확인합니다.",
    backHome: "처음으로",
  },
  zh: {
    language: "语言",
    prompt: "请选择要提交报告的门店。",
    brand: "选择品牌",
    country: "选择国家",
    city: "选择城市",
    store: "选择门店",
    confirm: "确认选择",
    selectedStore: "已选门店",
    changeStore: "更换门店",
    reportType: "请选择报告类型。",
    safety: "安全管理报告",
    safetyDesc: "需要紧急确认的安全问题",
    general: "一般报告",
    generalDesc: "运营、设施、客户反馈等",
    content: "内容",
    contentPlaceholder: "请具体描述情况。",
    reporter: "提交人",
    reporterPlaceholder: "请输入姓名。",
    photo: "上传照片",
    photoChoose: "选择文件",
    photoEmpty: "未选择文件",
    photoHint: "JPG / PNG · 最多5张",
    photoError: "无法添加照片。",
    submit: "提交",
    completeTitle: "报告已提交。",
    completeText: "管理员将确认提交内容。",
    backHome: "返回首页",
  },
  en: {
    language: "Language",
    prompt: "Select the store for this report.",
    brand: "Select brand",
    country: "Select country",
    city: "Select city",
    store: "Select store",
    confirm: "Confirm store",
    selectedStore: "Selected store",
    changeStore: "Change store",
    reportType: "Choose report type.",
    safety: "Safety report",
    safetyDesc: "Urgent safety issue for review",
    general: "General report",
    generalDesc: "Operations, facilities, customer VOC",
    content: "Content",
    contentPlaceholder: "Describe the situation clearly.",
    reporter: "Author",
    reporterPlaceholder: "Enter your name.",
    photo: "Attach photo",
    photoChoose: "Choose file",
    photoEmpty: "No file selected",
    photoHint: "JPG / PNG · up to 5",
    photoError: "Could not attach photo.",
    submit: "Submit",
    completeTitle: "Report submitted.",
    completeText: "The store admin will review the report.",
    backHome: "Start over",
  },
  ja: {
    language: "言語",
    prompt: "報告を登録するストアを選択してください。",
    brand: "ブランドを選択",
    country: "国を選択",
    city: "都市を選択",
    store: "ストア名を選択",
    confirm: "選択完了",
    selectedStore: "選択したストア",
    changeStore: "ストア変更",
    reportType: "報告タイプを選択してください。",
    safety: "安全管理報告",
    safetyDesc: "至急確認が必要な安全課題",
    general: "一般報告",
    generalDesc: "運営、施設、お客様VOCなど",
    content: "内容",
    contentPlaceholder: "状況を具体的に入力してください。",
    reporter: "作成者",
    reporterPlaceholder: "お名前を入力してください。",
    photo: "写真添付",
    photoChoose: "ファイルを選択",
    photoEmpty: "ファイルが選択されていません",
    photoHint: "JPG / PNG · 最大5枚",
    photoError: "写真を添付できませんでした。",
    submit: "送信",
    completeTitle: "報告が受け付けられました。",
    completeText: "管理者が内容を確認します。",
    backHome: "最初へ",
  },
};

export function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function sortByBrandOrder(
  items: readonly string[],
  brandOrder: readonly string[],
): string[] {
  const uniqueItems = Array.from(new Set(items));

  if (brandOrder.length === 0) {
    return uniqueItems.sort((a, b) => a.localeCompare(b));
  }

  const orderMap = new Map(brandOrder.map((brand, index) => [brand, index]));

  return uniqueItems.sort((a, b) => {
    const aIndex = orderMap.get(a);
    const bIndex = orderMap.get(b);

    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }

    if (aIndex !== undefined) {
      return -1;
    }

    if (bIndex !== undefined) {
      return 1;
    }

    return a.localeCompare(b);
  });
}

export function sortByDescendingCount(
  items: readonly string[],
  counts: ReadonlyMap<string, number>,
): string[] {
  const uniqueItems = Array.from(new Set(items));

  return uniqueItems.sort((a, b) => {
    const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }

    return a.localeCompare(b);
  });
}

export function buildCountMap(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

export function reorderBrand(
  allBrands: readonly string[],
  brandOrder: readonly string[],
  brand: string,
  direction: -1 | 1,
): string[] {
  const ordered = sortByBrandOrder(allBrands, brandOrder);
  const index = ordered.indexOf(brand);

  if (index === -1) {
    return ordered;
  }

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function brandNodeKey(brand: string) {
  return `b:${brand}`;
}

export function countryNodeKey(brand: string, country: string) {
  return `c:${brand}|${country}`;
}

export function cityNodeKey(brand: string, country: string, city: string) {
  return `t:${brand}|${country}|${city}`;
}

export function pathForStore(store?: Store) {
  if (!store) {
    return "Unassigned store";
  }

  return `${store.brand} / ${store.country} / ${store.city} / ${store.name}`;
}

export function statusClass(value: StoreStatus | ReportStatus | Urgency) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function buildQrUrl(token: string) {
  if (typeof window === "undefined") {
    return `/q/${token}`;
  }

  return `${window.location.origin}/q/${token}`;
}

export type SavedStaffSelection = {
  brand: string;
  country: string;
  city: string;
  storeId: string;
};

export function staffSelectionKey(scope: string) {
  return `store-hub-staff-selection:${scope}`;
}

export function readSavedStaffSelection(scope: string): SavedStaffSelection | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(staffSelectionKey(scope));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SavedStaffSelection;
    if (
      typeof parsed.brand !== "string" ||
      typeof parsed.country !== "string" ||
      typeof parsed.city !== "string" ||
      typeof parsed.storeId !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function restoreStaffSelection(
  activeStores: Store[],
  saved: SavedStaffSelection,
): SavedStaffSelection {
  let brand = "";
  let country = "";
  let city = "";
  let storeId = "";

  if (saved.brand && activeStores.some((store) => store.brand === saved.brand)) {
    brand = saved.brand;
  }

  if (
    brand &&
    saved.country &&
    activeStores.some((store) => store.brand === brand && store.country === saved.country)
  ) {
    country = saved.country;
  }

  if (
    brand &&
    country &&
    saved.city &&
    activeStores.some(
      (store) =>
        store.brand === brand && store.country === country && store.city === saved.city,
    )
  ) {
    city = saved.city;
  }

  if (brand && country && city && saved.storeId) {
    const store = activeStores.find(
      (item) =>
        item.id === saved.storeId &&
        item.brand === brand &&
        item.country === country &&
        item.city === city,
    );

    if (store) {
      storeId = store.id;
    }
  }

  return { brand, country, city, storeId };
}

export function persistStaffSelection(scope: string, selection: SavedStaffSelection) {
  window.localStorage.setItem(staffSelectionKey(scope), JSON.stringify(selection));
}

export function clearStaffSelection(scope: string) {
  window.localStorage.removeItem(staffSelectionKey(scope));
}

export type SavedStoreDraft = {
  brand: string;
  country: string;
  city: string;
  status: StoreStatus;
};

export function lastStoreDraftKey(ownerId: string) {
  return `store-hub-last-store-draft:${ownerId}`;
}

export function readLastStoreDraft(ownerId: string): SavedStoreDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(lastStoreDraftKey(ownerId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SavedStoreDraft;
    if (
      typeof parsed.brand !== "string" ||
      typeof parsed.country !== "string" ||
      typeof parsed.city !== "string" ||
      (parsed.status !== "Active" && parsed.status !== "Inactive")
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function persistLastStoreDraft(ownerId: string, draft: SavedStoreDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(lastStoreDraftKey(ownerId), JSON.stringify(draft));
}
