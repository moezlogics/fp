/**
 * useLoginGuard — Shared hook for Math CAPTCHA + IP Rate Limiting
 *
 * Usage:
 *   const guard = useLoginGuard("user" | "admin" | "owner");
 *
 *   // Render guard.captchaUI before submit button
 *   // Before signIn: if (!guard.validateCaptcha()) return;
 *   // On fail: await guard.recordFailure();
 *   // On success: await guard.recordSuccess();
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

type LoginType = "user" | "admin" | "owner";

interface MathProblem {
  question: string;
  answer: number;
}

function generateMathProblem(): MathProblem {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * a) + 1; // ensure positive result
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
  }

  return { question: `${a} ${op} ${b}`, answer: answer! };
}

export function useLoginGuard(loginType: LoginType) {
  const [blocked, setBlocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [problem, setProblem] = useState<MathProblem>(() =>
    generateMathProblem(),
  );
  const [loaded, setLoaded] = useState(false);

  // ── Check rate limit on mount ──
  useEffect(() => {
    fetch("/api/auth/login-guard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", loginType }),
    })
      .then((r) => r.json())
      .then((d) => {
        setBlocked(d.blocked || false);
        setAttemptsRemaining(d.attemptsRemaining ?? 5);
        setBlockedUntil(d.blockedUntil || null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [loginType]);

  const regenerateCaptcha = useCallback(() => {
    setProblem(generateMathProblem());
    setCaptchaInput("");
    setCaptchaError("");
  }, []);

  const validateCaptcha = useCallback((): boolean => {
    setCaptchaError("");
    const userAnswer = parseInt(captchaInput, 10);
    if (isNaN(userAnswer) || userAnswer !== problem.answer) {
      setCaptchaError("Wrong answer. Try again.");
      regenerateCaptcha();
      return false;
    }
    return true;
  }, [captchaInput, problem.answer, regenerateCaptcha]);

  const recordFailure = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/login-guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fail", loginType }),
      });
      const d = await res.json();
      setBlocked(d.blocked || false);
      setAttemptsRemaining(d.attemptsRemaining ?? 0);
      setBlockedUntil(d.blockedUntil || null);
      regenerateCaptcha();
    } catch {}
  }, [loginType, regenerateCaptcha]);

  const recordSuccess = useCallback(async () => {
    try {
      await fetch("/api/auth/login-guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", loginType }),
      });
      setBlocked(false);
      setAttemptsRemaining(5);
      setBlockedUntil(null);
    } catch {}
  }, [loginType]);

  // Computed warning message
  const warningMessage = useMemo(() => {
    if (blocked) return null; // blocked screen handles this
    if (attemptsRemaining < 5 && attemptsRemaining > 0) {
      return `⚠️ ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining before your IP is temporarily blocked.`;
    }
    return null;
  }, [blocked, attemptsRemaining]);

  return {
    blocked,
    attemptsRemaining,
    blockedUntil,
    loaded,
    // CAPTCHA
    mathQuestion: problem.question,
    captchaInput,
    setCaptchaInput,
    captchaError,
    validateCaptcha,
    regenerateCaptcha,
    // Rate limiting
    recordFailure,
    recordSuccess,
    warningMessage,
  };
}
