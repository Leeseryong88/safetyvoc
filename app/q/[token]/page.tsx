"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StaffExperience } from "@/components/staff/staff-experience";
import { getQrCodeByToken } from "@/lib/store-hub-firestore";
import { usePublicStoreData } from "@/lib/use-store-hub-data";

export default function PublicQrPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const { stores, brandOrder, isLoading, error, submitReport } = usePublicStoreData(ownerId);

  useEffect(() => {
    let cancelled = false;

    void getQrCodeByToken(token)
      .then((qrCode) => {
        if (cancelled) {
          return;
        }

        if (!qrCode) {
          setTokenError("유효하지 않거나 비활성화된 QR입니다.");
          setOwnerId(null);
          return;
        }

        setOwnerId(qrCode.ownerId);
        setQrLabel(qrCode.label);
      })
      .catch(() => {
        if (!cancelled) {
          setTokenError("QR 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (isResolving) {
    return (
      <main className="store-hub-app staff-mode">
        <p className="data-status">로딩 중...</p>
      </main>
    );
  }

  if (tokenError) {
    return (
      <main className="store-hub-app staff-mode">
        <p className="data-status error" role="alert">
          {tokenError}
        </p>
      </main>
    );
  }

  return (
    <main className="store-hub-app staff-mode">
      <header className="public-qr-header">
        <div className="brand-mark">
          <div>
            <p>TO HQ</p>
            <span>{qrLabel || "접수"}</span>
          </div>
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
        <StaffExperience
          brandOrder={brandOrder}
          onCreateReport={submitReport}
          scopeKey={`qr-${token}`}
          stores={stores}
        />
      )}
    </main>
  );
}
