"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { ReportInput, ReportType, Store } from "@/lib/types";
import { compressImageFile } from "@/lib/compress-image";
import {
  buildCountMap,
  clearStaffSelection,
  LANGUAGE_OPTIONS,
  MAX_REPORT_PHOTOS,
  persistStaffSelection,
  readSavedStaffSelection,
  restoreStaffSelection,
  staffCopy,
  type Language,
  pathForStore,
  sortByBrandOrder,
  sortByDescendingCount,
} from "@/lib/store-hub-utils";

type StaffStep = "language" | "select" | "type" | "compose" | "complete";
type PickerField = "brand" | "country" | "city" | "store";

type PhotoDraft = {
  file: File;
  previewUrl: string;
};

export function StaffExperience({
  brandOrder = [],
  onCreateReport,
  scopeKey,
  stores,
}: {
  brandOrder?: string[];
  onCreateReport: (store: Store, input: ReportInput) => Promise<string>;
  scopeKey: string;
  stores: Store[];
}) {
  const [language, setLanguage] = useState<Language>("ko");
  const [step, setStep] = useState<StaffStep>("language");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [reportType, setReportType] = useState<ReportType>("Safety");
  const [reporterName, setReporterName] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [photoDrafts, setPhotoDrafts] = useState<PhotoDraft[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRestoredSelection, setHasRestoredSelection] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = staffCopy[language];

  const activeStores = useMemo(
    () => stores.filter((store) => store.status === "Active"),
    [stores],
  );
  const availableBrands = useMemo(
    () => sortByBrandOrder(activeStores.map((store) => store.brand), brandOrder),
    [activeStores, brandOrder],
  );
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const brandScopedStores = useMemo(
    () =>
      activeStores.filter((store) => !selectedBrand || store.brand === selectedBrand),
    [activeStores, selectedBrand],
  );
  const countries = useMemo(() => {
    const countryCounts = buildCountMap(brandScopedStores.map((store) => store.country));

    return sortByDescendingCount(
      brandScopedStores.map((store) => store.country),
      countryCounts,
    );
  }, [brandScopedStores]);
  const cities = useMemo(() => {
    const cityScopedStores = activeStores.filter(
      (store) => store.brand === selectedBrand && store.country === selectedCountry,
    );
    const cityCounts = buildCountMap(cityScopedStores.map((store) => store.city));

    return sortByDescendingCount(
      cityScopedStores.map((store) => store.city),
      cityCounts,
    );
  }, [activeStores, selectedBrand, selectedCountry]);
  const availableStores = useMemo(
    () =>
      activeStores.filter(
        (store) =>
          store.brand === selectedBrand &&
          store.country === selectedCountry &&
          store.city === selectedCity,
      ),
    [activeStores, selectedBrand, selectedCountry, selectedCity],
  );

  useEffect(() => {
    if (hasRestoredSelection) {
      return;
    }

    const saved = readSavedStaffSelection(scopeKey);
    if (saved) {
      const restored = restoreStaffSelection(activeStores, saved);
      setSelectedBrand(restored.brand);
      setSelectedCountry(restored.country);
      setSelectedCity(restored.city);
      setSelectedStoreId(restored.storeId);
    }

    setHasRestoredSelection(true);
  }, [activeStores, hasRestoredSelection, scopeKey]);

  useEffect(() => {
    if (!hasRestoredSelection || step !== "select" || !selectedStore) {
      return;
    }

    setStep("type");
  }, [hasRestoredSelection, selectedStore, step]);

  useEffect(() => {
    if (!hasRestoredSelection) {
      return;
    }

    if (!selectedBrand && !selectedCountry && !selectedCity && !selectedStoreId) {
      clearStaffSelection(scopeKey);
      return;
    }

    persistStaffSelection(scopeKey, {
      brand: selectedBrand,
      country: selectedCountry,
      city: selectedCity,
      storeId: selectedStoreId,
    });
  }, [
    hasRestoredSelection,
    scopeKey,
    selectedBrand,
    selectedCountry,
    selectedCity,
    selectedStoreId,
  ]);

  useEffect(() => {
    return () => {
      photoDrafts.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [photoDrafts]);

  function clearPhotoDrafts() {
    setPhotoDrafts((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  }

  function removePhotoDraft(index: number) {
    setPhotoDrafts((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  }

  function chooseLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setStep("select");
  }

  function resetSelection() {
    setSelectedBrand("");
    setSelectedCountry("");
    setSelectedCity("");
    setSelectedStoreId("");
    setActivePicker(null);
    clearStaffSelection(scopeKey);
    setStep("select");
  }

  function openPicker(field: PickerField) {
    setActivePicker(field);
  }

  function closePicker() {
    setActivePicker(null);
  }

  function handleBrandSelect(brand: string) {
    setSelectedBrand(brand);
    setSelectedCountry("");
    setSelectedCity("");
    setSelectedStoreId("");
    closePicker();
    setActivePicker("country");
  }

  function handleCountrySelect(country: string) {
    setSelectedCountry(country);
    setSelectedCity("");
    setSelectedStoreId("");
    closePicker();
    setActivePicker("city");
  }

  function handleCitySelect(city: string) {
    setSelectedCity(city);
    setSelectedStoreId("");
    closePicker();
    setActivePicker("store");
  }

  function handleStoreSelect(storeId: string) {
    setSelectedStoreId(storeId);
    closePicker();
    setStep("type");
  }

  const pickerConfig = {
    brand: {
      title: t.brand,
      options: availableBrands.map((brand) => ({ value: brand, label: brand })),
      onSelect: handleBrandSelect,
    },
    country: {
      title: t.country,
      options: countries.map((country) => ({ value: country, label: country })),
      onSelect: handleCountrySelect,
    },
    city: {
      title: t.city,
      options: cities.map((city) => ({ value: city, label: city })),
      onSelect: handleCitySelect,
    },
    store: {
      title: t.store,
      options: availableStores.map((store) => ({ value: store.id, label: store.name })),
      onSelect: handleStoreSelect,
    },
  } satisfies Record<
    PickerField,
    { title: string; options: { value: string; label: string }[]; onSelect: (value: string) => void }
  >;

  const activePickerConfig = activePicker ? pickerConfig[activePicker] : null;

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const remainingSlots = MAX_REPORT_PHOTOS - photoDrafts.length;
    if (remainingSlots <= 0) {
      setPhotoError(`사진은 최대 ${MAX_REPORT_PHOTOS}장까지 첨부할 수 있습니다.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    setIsCompressingPhoto(true);
    setPhotoError(null);

    void Promise.all(filesToAdd.map((file) => compressImageFile(file)))
      .then((compressedFiles) => {
        setPhotoDrafts((current) => [
          ...current,
          ...compressedFiles.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
          })),
        ]);
      })
      .catch((error) => {
        setPhotoError(
          error instanceof Error ? error.message : "사진 압축에 실패했습니다.",
        );
      })
      .finally(() => {
        setIsCompressingPhoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      });
  }

  function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStore || !reportContent.trim() || !reporterName.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    void onCreateReport(selectedStore, {
      storeId: selectedStore.id,
      type: reportType,
      urgency: reportType === "Safety" ? "High" : "Normal",
      status: "New",
      reporter: reporterName.trim(),
      photoName:
        photoDrafts.length > 0
          ? photoDrafts.map((photo) => photo.file.name).join(", ")
          : undefined,
      photoFiles: photoDrafts.length > 0 ? photoDrafts.map((photo) => photo.file) : undefined,
      content: reportContent.trim(),
    })
      .then((id) => {
        setSubmittedId(id);
        setReporterName("");
        setReportContent("");
        clearPhotoDrafts();
        setPhotoError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setStep("complete");
      })
      .catch((error) => {
        setSubmitError(
          error instanceof Error ? error.message : "제출에 실패했습니다.",
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <section className="staff-surface" aria-label="Staff QR experience">
      <div className="phone-shell">
        <div className="staff-heading">
          <p>TO HQ</p>
          {step === "language" ? (
            <h1>Language / 语言 / 言語</h1>
          ) : (
            <h1>{t.prompt}</h1>
          )}
        </div>

        {step === "language" && (
          <div className="stack">
            <div className="section-title">
              <h2>언어를 선택해주세요</h2>
              <p className="language-screen-note">
                Please select your language to continue.
              </p>
            </div>
            <div className="language-grid">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  className="language-card"
                  key={option.value}
                  onClick={() => chooseLanguage(option.value)}
                  type="button"
                >
                  <strong>{option.native}</strong>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "select" && (
          <div className="stack">
            {activeStores.length === 0 ? (
              <p className="empty-message">등록된 활성 스토어가 없습니다.</p>
            ) : (
              <>
                <div className="select-stack">
                  <button
                    className="staff-picker-field"
                    onClick={() => openPicker("brand")}
                    type="button"
                  >
                    <span>{t.brand}</span>
                    <strong className={selectedBrand ? "" : "placeholder"}>
                      {selectedBrand || t.brand}
                    </strong>
                  </button>

                  <button
                    className="staff-picker-field"
                    disabled={!selectedBrand}
                    onClick={() => openPicker("country")}
                    type="button"
                  >
                    <span>{t.country}</span>
                    <strong className={selectedCountry ? "" : "placeholder"}>
                      {selectedCountry || t.country}
                    </strong>
                  </button>

                  <button
                    className="staff-picker-field"
                    disabled={!selectedCountry}
                    onClick={() => openPicker("city")}
                    type="button"
                  >
                    <span>{t.city}</span>
                    <strong className={selectedCity ? "" : "placeholder"}>
                      {selectedCity || t.city}
                    </strong>
                  </button>

                  <button
                    className="staff-picker-field"
                    disabled={!selectedCity}
                    onClick={() => openPicker("store")}
                    type="button"
                  >
                    <span>{t.store}</span>
                    <strong className={selectedStore ? "" : "placeholder"}>
                      {selectedStore?.name || t.store}
                    </strong>
                  </button>
                </div>
              </>
            )}
            <button
              className="text-link-button language-back"
              onClick={() => setStep("language")}
              type="button"
            >
              ← {t.language}
            </button>
          </div>
        )}

        {step !== "select" && step !== "language" && selectedStore && (
          <div className="store-context">
            <span>{t.selectedStore}</span>
            <strong>{pathForStore(selectedStore)}</strong>
            <button onClick={resetSelection} type="button">
              {t.changeStore}
            </button>
          </div>
        )}

        {step === "type" && (
          <div className="stack">
            <div className="section-title">
              <h2>{t.reportType}</h2>
            </div>
            <button
              className="type-card safety"
              onClick={() => {
                setReportType("Safety");
                setStep("compose");
              }}
              type="button"
            >
              <strong>{t.safety}</strong>
              <span>{t.safetyDesc}</span>
            </button>
            <button
              className="type-card"
              onClick={() => {
                setReportType("General");
                setStep("compose");
              }}
              type="button"
            >
              <strong>{t.general}</strong>
              <span>{t.generalDesc}</span>
            </button>
          </div>
        )}

        {step === "compose" && selectedStore && (
          <form className="report-form" onSubmit={handleReportSubmit}>
            <label>
              <span>{t.reporter}</span>
              <input
                onChange={(event) => setReporterName(event.target.value)}
                placeholder={t.reporterPlaceholder}
                required
                type="text"
                value={reporterName}
              />
            </label>

            <label>
              <span>{t.content}</span>
              <textarea
                onChange={(event) => setReportContent(event.target.value)}
                placeholder={t.contentPlaceholder}
                value={reportContent}
              />
            </label>

            <div className="upload-box">
              <span>{t.photo}</span>
              <input
                accept="image/*"
                className="upload-input-hidden"
                multiple
                onChange={handlePhotoChange}
                ref={fileInputRef}
                type="file"
              />
              <div className="upload-control">
                <button
                  className="upload-trigger"
                  disabled={isCompressingPhoto || photoDrafts.length >= MAX_REPORT_PHOTOS}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {isCompressingPhoto ? t.photoCompressing : t.photoChoose}
                </button>
                <p className="upload-status">
                  {isCompressingPhoto
                    ? t.photoCompressing
                    : photoDrafts.length > 0
                      ? `${photoDrafts.length} / ${MAX_REPORT_PHOTOS}`
                      : t.photoEmpty}
                </p>
                {photoError && <p className="auth-error">{photoError}</p>}
                {photoDrafts.length === 0 && !isCompressingPhoto && (
                  <em className="upload-hint">{t.photoHint}</em>
                )}
              </div>
              {photoDrafts.length > 0 ? (
                <div className="photo-preview-grid">
                  {photoDrafts.map((photo, index) => (
                    <div className="photo-preview-item" key={photo.previewUrl}>
                      <div
                        aria-label={photo.file.name}
                        className="photo-preview"
                        role="img"
                        style={{ backgroundImage: `url(${photo.previewUrl})` }}
                      />
                      <button
                        aria-label={`Remove ${photo.file.name}`}
                        className="photo-preview-remove"
                        disabled={isCompressingPhoto}
                        onClick={() => removePhotoDraft(index)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {submitError && <p className="auth-error">{submitError}</p>}

            <button
              className="primary-button full"
              disabled={
                !reporterName.trim() ||
                !reportContent.trim() ||
                isSubmitting ||
                isCompressingPhoto
              }
              type="submit"
            >
              {isSubmitting ? "..." : t.submit}
            </button>
          </form>
        )}

        {step === "complete" && (
          <div className="complete-card">
            <span>{submittedId}</span>
            <h2>{t.completeTitle}</h2>
            <p>{t.completeText}</p>
            <button className="primary-button full" onClick={resetSelection} type="button">
              {t.backHome}
            </button>
          </div>
        )}

        {activePickerConfig && (
          <StaffPickerModal
            onClose={closePicker}
            onSelect={activePickerConfig.onSelect}
            options={activePickerConfig.options}
            title={activePickerConfig.title}
          />
        )}
      </div>
    </section>
  );
}

function StaffPickerModal({
  onClose,
  onSelect,
  options,
  title,
}: {
  onClose: () => void;
  onSelect: (value: string) => void;
  options: { value: string; label: string }[];
  title: string;
}) {
  return (
    <div className="staff-picker-backdrop" onClick={onClose} role="presentation">
      <div
        aria-label={title}
        aria-modal="true"
        className="staff-picker-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="staff-picker-heading">
          <h2>{title}</h2>
          <button onClick={onClose} type="button">
            ×
          </button>
        </div>
        {options.length === 0 ? (
          <p className="empty-message staff-picker-empty">선택 가능한 항목이 없습니다.</p>
        ) : (
          <ul className="staff-picker-list">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  className="staff-picker-option"
                  onClick={() => onSelect(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
