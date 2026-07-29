"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { changePassword } from "@/lib/auth";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("비밀번호가 변경되었습니다.");
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "비밀번호 변경에 실패했습니다.";
      setError(translatePasswordError(message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel password-change-panel">
      <div className="panel-heading">
        <div>
          <h2>비밀번호 변경</h2>
          <p className="panel-description">현재 비밀번호 확인 후 새 비밀번호로 변경합니다.</p>
        </div>
      </div>

      <form className="auth-form password-change-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="field-control">
          <span>현재 비밀번호</span>
          <input
            autoComplete="current-password"
            minLength={6}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </label>

        <label className="field-control">
          <span>새 비밀번호</span>
          <input
            autoComplete="new-password"
            minLength={6}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="6자 이상"
            required
            type="password"
            value={newPassword}
          />
        </label>

        <label className="field-control">
          <span>새 비밀번호 확인</span>
          <input
            autoComplete="new-password"
            minLength={6}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="auth-success" role="status">
            {success}
          </p>
        )}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </section>
  );
}

function translatePasswordError(message: string) {
  if (
    message.includes("auth/invalid-credential") ||
    message.includes("auth/wrong-password") ||
    message.includes("auth/invalid-login-credentials")
  ) {
    return "현재 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("auth/weak-password")) {
    return "새 비밀번호가 너무 약합니다. 6자 이상 입력해 주세요.";
  }
  if (message.includes("auth/requires-recent-login")) {
    return "보안을 위해 다시 로그인한 뒤 시도해 주세요.";
  }
  if (message.includes("auth/too-many-requests")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (message.includes("로그인이 필요합니다")) {
    return "로그인이 필요합니다.";
  }

  return message;
}
