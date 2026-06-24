"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import "./bento.css";

const MOBILE_BREAKPOINT = 768;

function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const createParticle = (x, y, color) => {
  const el = document.createElement("div");
  el.className = "bento-particle";
  el.style.cssText = `position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(${color},1);box-shadow:0 0 6px rgba(${color},0.6);pointer-events:none;z-index:2;left:${x}px;top:${y}px;`;
  return el;
};

const updateGlow = (card, mx, my, glow, radius) => {
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--glow-x", `${((mx - rect.left) / rect.width) * 100}%`);
  card.style.setProperty("--glow-y", `${((my - rect.top) / rect.height) * 100}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

export function BentoCard({
  children,
  className = "",
  glowColor = "139, 92, 246",
  particleCount = 8,
  clickEffect = true,
  onClick = undefined,
  style = undefined,
}) {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const hoveredRef = useRef(false);
  const memo = useRef([]);
  const init = useRef(false);
  const isMobile = useMobile();

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => p.parentNode?.removeChild(p),
      });
    });
    particlesRef.current = [];
  }, []);

  useEffect(() => {
    if (isMobile || !cardRef.current) return;
    const el = cardRef.current;

    const animate = () => {
      if (!hoveredRef.current) return;
      if (!init.current) {
        const { width, height } = el.getBoundingClientRect();
        memo.current = Array.from({ length: particleCount }, () =>
          createParticle(Math.random() * width, Math.random() * height, glowColor),
        );
        init.current = true;
      }
      memo.current.forEach((particle, i) => {
        const t = setTimeout(() => {
          if (!hoveredRef.current) return;
          const clone = particle.cloneNode(true);
          el.appendChild(clone);
          particlesRef.current.push(clone);
          gsap.fromTo(
            clone,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" },
          );
          gsap.to(clone, {
            x: (Math.random() - 0.5) * 80,
            y: (Math.random() - 0.5) * 80,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: "none",
            repeat: -1,
            yoyo: true,
          });
          gsap.to(clone, {
            opacity: 0.3,
            duration: 1.5,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true,
          });
        }, i * 100);
        timeoutsRef.current.push(t);
      });
    };

    const onEnter = () => {
      hoveredRef.current = true;
      animate();
    };
    const onLeave = () => {
      hoveredRef.current = false;
      clearParticles();
    };
    const onClickFx = (e) => {
      if (!clickEffect) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const max = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height),
      );
      const ripple = document.createElement("div");
      ripple.style.cssText = `position:absolute;width:${max * 2}px;height:${max * 2}px;border-radius:50%;background:radial-gradient(circle, rgba(${glowColor},0.3) 0%, rgba(${glowColor},0.15) 30%, transparent 70%);left:${x - max}px;top:${y - max}px;pointer-events:none;z-index:1;`;
      el.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => ripple.remove(),
        },
      );
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("click", onClickFx);
    return () => {
      hoveredRef.current = false;
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("click", onClickFx);
      clearParticles();
    };
  }, [isMobile, particleCount, glowColor, clickEffect, clearParticles]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{ ...style, "--glow-color": glowColor }}
      className={`bento-card bento-card--glow ${className}`}
    >
      {children}
    </div>
  );
}

function Spotlight({ gridRef, glowColor, radius = 320 }) {
  const ref = useRef(null);
  const isMobile = useMobile();
  useEffect(() => {
    if (isMobile || !gridRef?.current) return;
    const spot = document.createElement("div");
    spot.className = "bento-spotlight";
    spot.style.cssText = `position:fixed;width:700px;height:700px;border-radius:50%;pointer-events:none;background:radial-gradient(circle, rgba(${glowColor},0.12) 0%, rgba(${glowColor},0.06) 20%, rgba(${glowColor},0.02) 40%, transparent 70%);z-index:5;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
    document.body.appendChild(spot);
    ref.current = spot;

    const move = (e) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      const cards = gridRef.current.querySelectorAll(".bento-card");
      if (!inside) {
        gsap.to(spot, { opacity: 0, duration: 0.3 });
        cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
        return;
      }
      const prox = radius * 0.5;
      const fade = radius * 0.75;
      let minD = Infinity;
      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d =
          Math.hypot(e.clientX - cx, e.clientY - cy) -
          Math.max(r.width, r.height) / 2;
        const eff = Math.max(0, d);
        minD = Math.min(minD, eff);
        let g = 0;
        if (eff <= prox) g = 1;
        else if (eff <= fade) g = (fade - eff) / (fade - prox);
        updateGlow(c, e.clientX, e.clientY, g, radius);
      });
      gsap.to(spot, { left: e.clientX, top: e.clientY, duration: 0.1 });
      const op =
        minD <= prox ? 0.8 : minD <= fade ? ((fade - minD) / (fade - prox)) * 0.8 : 0;
      gsap.to(spot, { opacity: op, duration: op > 0 ? 0.2 : 0.5 });
    };

    document.addEventListener("mousemove", move);
    return () => {
      document.removeEventListener("mousemove", move);
      ref.current?.parentNode?.removeChild(ref.current);
    };
  }, [gridRef, glowColor, radius, isMobile]);
  return null;
}

export function BentoGrid({ children, glowColor = "139, 92, 246", className = "" }) {
  const gridRef = useRef(null);
  return (
    <>
      <Spotlight gridRef={gridRef} glowColor={glowColor} />
      <div ref={gridRef} className={`bento-section ${className}`}>
        {children}
      </div>
    </>
  );
}
