"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function ChampionConfetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;

    const colors = ["#16a34a", "#facc15", "#f97316", "#3b82f6", "#e11d48"];

    confetti({
      particleCount: 140,
      spread: 100,
      startVelocity: 45,
      origin: { y: 0.3 },
      colors,
    });

    const duration = 2000;
    const end = Date.now() + duration;

    (function burstFromSides() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(burstFromSides);
    })();
  }, [active]);

  return null;
}
