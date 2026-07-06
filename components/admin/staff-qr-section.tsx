"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { StaffExperience } from "@/components/staff/staff-experience";
import type { QrCode, ReportInput, Store } from "@/lib/types";
import { buildQrUrl } from "@/lib/store-hub-utils";

export function StaffQrSection({
  brandOrder = [],
  onAddQrCode,
  onCreateReport,
  onRemoveQrCode,
  qrCodes,
  stores,
}: {
  brandOrder?: string[];
  onAddQrCode: () => Promise<string>;
  onCreateReport: (store: Store, input: ReportInput) => Promise<string>;
  onRemoveQrCode: (token: string) => Promise<void>;
  qrCodes: QrCode[];
  stores: Store[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrCode = qrCodes[0] ?? null;
  const qrUrl = qrCode ? buildQrUrl(qrCode.id) : "";
  const hasQr = qrCodes.length > 0;

  async function handleCreate() {
    if (hasQr) {
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      await onAddQrCode();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "QR 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="admin-view">
      <div className="view-heading with-action">
        <div>
          <p>Staff QR</p>
          <h1>사용자 미리보기</h1>
        </div>
        <button className="primary-button" onClick={() => setIsModalOpen(true)} type="button">
          QR 관리
        </button>
      </div>

      <section className="panel preview-panel">
        <StaffExperience
          brandOrder={brandOrder}
          onCreateReport={onCreateReport}
          scopeKey={`preview-${qrCode?.id ?? "default"}`}
          stores={stores}
        />
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-sheet qr-manage-modal">
            <div className="modal-heading">
              <h2>QR 관리</h2>
              <button onClick={() => setIsModalOpen(false)} type="button">
                Close
              </button>
            </div>

            {!hasQr ? (
              <div className="qr-modal-body">
                {error && <p className="auth-error">{error}</p>}
                <p className="empty-message">생성된 QR이 없습니다.</p>
                <button
                  className="primary-button"
                  disabled={isCreating}
                  onClick={() => void handleCreate()}
                  type="button"
                >
                  {isCreating ? "생성 중..." : "QR 생성"}
                </button>
              </div>
            ) : (
              <div className="qr-modal-body">
                <p className="qr-single-url">{qrUrl}</p>
                <div className="qr-display">
                  <QRCodeSVG size={200} value={qrUrl} />
                </div>
                <div className="qr-card-actions">
                  <button
                    className="ghost-button"
                    onClick={() => void navigator.clipboard.writeText(qrUrl)}
                    type="button"
                  >
                    링크 복사
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (window.confirm("QR을 삭제하시겠습니까? 삭제 후 다시 생성할 수 있습니다.")) {
                        void onRemoveQrCode(qrCode.id);
                      }
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
