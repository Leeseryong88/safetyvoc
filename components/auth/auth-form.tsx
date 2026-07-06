"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email.trim(), password);
      router.replace("/admin/dashboard");
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "인증에 실패했습니다.";
      setError(translateAuthError(message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark auth-brand">
          <div>
            <p>STORE VOC</p>
            <span>스토어 의견청취</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-control">
            <span>이메일</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field-control">
            <span>비밀번호</span>
            <input
              autoComplete="current-password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6자 이상"
              required
              type="password"
              value={password}
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "처리 중..." : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}

function translateAuthError(message: string) {
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("auth/invalid-email")) {
    return "유효하지 않은 이메일 형식입니다.";
  }

  return message;
}
