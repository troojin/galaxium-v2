"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import landingData from "@/data/landing.json";
import testimonialsData from "@/data/testimonials.json";

function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5" />
    </svg>
  );
}

function InsertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12M12 16l-5-5M12 16l5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}


const ICONS: { [key: string]: () => React.JSX.Element } = {
  spark: SparkIcon,
  insert: InsertIcon,
  eye: EyeIcon,
  shield: ShieldIcon,
};

const FEATURES = landingData.features;
const STEPS = landingData.steps;
const FAQS = landingData.faqs;
const TESTIMONIALS = testimonialsData;

const MARQUEE_SPEED = 42; // px/sec — shared by both rows so they always match
const MARQUEE_HOVER_MULTIPLIER = 0.28;

function useMarquee(direction: 1 | -1, speed = MARQUEE_SPEED) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const speedMultRef = useRef(1);
  const targetMultRef = useRef(1);
  const rafRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function frame(time: number) {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      // ease the current speed toward its target every frame — this is the tween,
      // so slowing down on hover glides instead of snapping to a new rate
      const ease = 1 - Math.pow(0.0005, dt);
      speedMultRef.current += (targetMultRef.current - speedMultRef.current) * ease;

      const track = trackRef.current;
      if (track) {
        const halfWidth = track.scrollWidth / 2;
        offsetRef.current += direction * speed * speedMultRef.current * dt;

        if (halfWidth > 0) {
          offsetRef.current = ((offsetRef.current % halfWidth) + halfWidth) % halfWidth;
        }

        track.style.transform = `translateX(${-offsetRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      rafRef.current = requestAnimationFrame(frame);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [direction, speed]);

  return {
    trackRef,
  };
}

export default function LandingPage() {
  const brandRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const marqueeRowOne = useMarquee(1);
  const marqueeRowTwo = useMarquee(-1);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setIsLoggedIn(!!data.session);
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;

    card.style.transition = "transform 0.05s linear";
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.035, 1.035, 1.035)`;
    card.style.setProperty("--light-x", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--light-y", `${(y / rect.height) * 100}%`);
    card.style.setProperty("--light-opacity", "1");
  }

  function handleCardMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    const card = e.currentTarget;
    card.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    card.style.setProperty("--light-opacity", "0");
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }

        .primary-btn { transition: filter 0.2s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
        .primary-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .primary-btn:active { transform: translateY(0) scale(0.97); }

        .ghost-btn { transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.22) !important; background: rgba(255,255,255,0.04) !important; color: #ffffff !important; }

        .nav-link { transition: color 0.2s ease; }
        .nav-link:hover { color: #ffffff !important; }

        .glass-sheen { position: relative; }
        .glass-sheen::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.008) 60%, rgba(255,255,255,0) 100%);
          border-radius: 24px 24px 0 0;
          pointer-events: none;
        }
        .glass-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.25), inset 0 -0.5px 0 rgba(255,255,255,0.03);
          pointer-events: none;
        }

        .features-grid, .steps-grid { perspective: 1000px; }
        .feature-card {
          position: relative;
          overflow: hidden;
          transform-style: preserve-3d;
          will-change: transform;
          transition: border-color 0.2s ease, background-color 0.2s ease;
          --light-x: 50%;
          --light-y: 50%;
          --light-opacity: 0;
        }
        .feature-card:hover { border-color: rgba(255,255,255,0.14) !important; }
        .feature-card-light {
          position: absolute;
          inset: 0;
          background: radial-gradient(280px circle at var(--light-x) var(--light-y), rgba(255,255,255,0.10), transparent 60%);
          opacity: var(--light-opacity);
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .feature-layer-icon { transform: translateZ(28px); transition: transform 0.05s linear; }
        .feature-layer-text { transform: translateZ(14px); transition: transform 0.05s linear; }

        .faq-item { transition: border-color 0.2s ease, background-color 0.2s ease; }
        .faq-item:hover { border-color: rgba(255,255,255,0.12) !important; }

        .faq-question { transition: color 0.2s ease; }
        .faq-question:hover .faq-q-text { color: #ffffff !important; }

        .faq-answer-wrap {
          overflow: hidden;
          transition: grid-template-rows 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: grid;
          grid-template-rows: 0fr;
        }
        .faq-answer-wrap.open {
          grid-template-rows: 1fr;
        }
        .faq-answer-inner {
          min-height: 0;
        }

        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rainbow-v2 {
          background: linear-gradient(90deg, #ff5f6d, #ffc371, #a8e063, #56ccf2, #8b5cf6, #ff5f6d);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: rainbowShift 4s linear infinite;
        }
        @keyframes rainbowShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        @media (max-width: 860px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }

        .testimonials-marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
        }
        .testimonials-track {
          display: flex;
          width: max-content;
          gap: 14px;
          --marquee-duration: 34s;
          animation: testimonialsScroll var(--marquee-duration) linear infinite;
        }
        @keyframes testimonialsScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .testimonials-track-reverse {
          animation-direction: reverse;
        }
        .testimonial-card {
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .testimonial-card:hover {
          border-color: rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.03);
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
          .faq-answer-wrap { transition: none !important; }
          .testimonials-track { animation: none !important; }
        }
      `}</style>

      <div style={styles.topbar}>
        <div ref={brandRef} style={styles.brandWrap}>
          <img src="/icons/icon.png" alt="Galaxium" style={styles.brandIconImg} />
          <span style={styles.brandInlineText}>
            Galaxium <span className="rainbow-v2" style={styles.rainbowV2}>V2</span>
          </span>
        </div>
        <nav style={styles.navLinks}>
          <a
            href="https://dsc.gg/glxm"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            style={styles.navLink}
          >
            Discord
          </a>
          <Link
            href={isLoggedIn ? "/dashboard" : "/auth/login"}
            className="primary-btn"
            style={styles.navCta}
          >
            {isLoggedIn ? "Open Dashboard" : "Log in"}
          </Link>
        </nav>
      </div>

      <main style={styles.main}>
        <section style={styles.hero}>
          <h1 className="fade-up" style={styles.title}>
            Describe it. Watch it build itself in Studio.
          </h1>
          <p className="fade-up" style={{ ...styles.subtitle, animationDelay: "0.05s" }}>
            Galaxium turns plain-English requests into real Roblox instances and
            working Luau scripts, then drops them into your place automatically
            while you're still typing the next message.
          </p>
          <div className="fade-up" style={{ ...styles.heroCtas, animationDelay: "0.1s" }}>
            <Link href="/dashboard" className="primary-btn" style={styles.submitBtn}>
              Start Building
            </Link>
            <a
              href="https://dsc.gg/glxm"
              target="_blank"
              rel="noopener noreferrer"
              className="ghost-btn"
              style={styles.ghostBtn}
            >
              Join our Discord
            </a>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Built for how you actually build in Studio</h2>
          </div>
          <div className="features-grid" style={styles.featuresGrid}>
            {FEATURES.map((f, i) => {
              const Icon = ICONS[f.icon];
              return (
                <div
                  key={f.title}
                  className="feature-card fade-up"
                  style={{ ...styles.featureCard, animationDelay: `${0.05 * i}s` }}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div className="feature-card-light" />
                  <div style={styles.featureIcon} className="feature-layer-icon">
                    <Icon />
                  </div>
                  <h3 style={styles.featureTitle} className="feature-layer-text">{f.title}</h3>
                  <p style={styles.featureBody} className="feature-layer-text">{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>From idea to instance in three steps</h2>
          </div>
          <div className="steps-grid" style={styles.stepsGrid}>
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="feature-card fade-up"
                style={{ ...styles.stepCard, animationDelay: `${0.05 * i}s` }}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="feature-card-light" />
                <h3 style={styles.stepTitle} className="feature-layer-text">{s.title}</h3>
                <p style={styles.stepBody} className="feature-layer-text">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Questions people usually ask</h2>
          </div>
          <div style={styles.faqList}>
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="faq-item fade-up"
                  style={{ ...styles.faqItem, animationDelay: `${0.03 * i}s` }}
                >
                  <button
                    type="button"
                    className="faq-question"
                    style={styles.faqQuestion}
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="faq-q-text" style={styles.faqQuestionText}>{item.q}</span>
                    <span
                      style={{
                        ...styles.faqChevron,
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      <ChevronIcon />
                    </span>
                  </button>
                  <div className={`faq-answer-wrap${open ? " open" : ""}`}>
                    <div className="faq-answer-inner">
                      <p style={styles.faqAnswer}>{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={styles.sectionNoPaddingBottom}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>What builders are saying</h2>
          </div>
        </section>

        <div className="testimonials-marquee" style={styles.testimonialsMarquee}>
          <div className="testimonials-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={`${t.robloxUsername}-${i}`} className="testimonial-card" style={styles.testimonialCard}>
                <p style={styles.testimonialQuote}>"{t.quote}"</p>
                <div style={styles.testimonialAuthor}>
                  <img
                    src={`/api/roblox/avatar?username=${encodeURIComponent(t.robloxUsername)}`}
                    alt={t.displayName}
                    style={styles.testimonialAvatar}
                  />
                  <div>
                    <div style={styles.testimonialName}>@{t.displayName}</div>
                    <div style={styles.testimonialHandle}>{t.robloxUsername} on Roblox</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="testimonials-marquee" style={styles.testimonialsMarqueeSecondRow}>
          <div className="testimonials-track testimonials-track-reverse">
            {[...TESTIMONIALS, ...TESTIMONIALS].reverse().map((t, i) => (
              <div key={`${t.robloxUsername}-rev-${i}`} className="testimonial-card" style={styles.testimonialCard}>
                <p style={styles.testimonialQuote}>"{t.quote}"</p>
                <div style={styles.testimonialAuthor}>
                  <img
                    src={`/api/roblox/avatar?username=${encodeURIComponent(t.robloxUsername)}`}
                    alt={t.displayName}
                    style={styles.testimonialAvatar}
                  />
                  <div>
                    <div style={styles.testimonialName}>@{t.displayName}</div>
                    <div style={styles.testimonialHandle}>{t.robloxUsername} on Roblox</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  brandWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandIconImg: {
    width: 22,
    height: 22,
    objectFit: "contain",
  },
  brandInlineText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
  },
  rainbowV2: {
    fontWeight: 800,
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
  navLink: {
    color: "#9a9aa5",
    fontSize: 13.5,
    fontWeight: 500,
    textDecoration: "none",
  },
  navCta: {
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "8px 15px",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "0 2px 10px rgba(91,33,182,0.35), inset 0 0.5px 0 rgba(255,255,255,0.2)",
  },
  main: {
    position: "relative",
    zIndex: 1,
    flex: 1,
  },
  hero: {
    position: "relative",
    maxWidth: 720,
    margin: "0 auto",
    padding: "96px 24px 80px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: 700,
    lineHeight: 1.12,
    letterSpacing: "-0.02em",
    margin: "0 0 16px",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 15.5,
    lineHeight: 1.65,
    margin: "0 auto 30px",
    maxWidth: 480,
  },
  heroCtas: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "13px 22px",
    fontSize: 14.5,
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "0 4px 16px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    color: "#c4c4cc",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "13px 22px",
    fontSize: 14.5,
    fontWeight: 600,
    textDecoration: "none",
  },
  section: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "64px 24px",
  },
  sectionHeader: {
    margin: "0 auto 36px",
    maxWidth: 560,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: 700,
    letterSpacing: "-0.015em",
    margin: 0,
    lineHeight: 1.25,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
  },
  featureCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "22px 20px",
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "rgba(139,92,246,0.12)",
    border: "1px solid rgba(139,92,246,0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#a78bfa",
    marginBottom: 14,
  },
  featureTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    margin: "0 0 8px",
    letterSpacing: "-0.01em",
  },
  featureBody: {
    color: "#9a9aa5",
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  stepCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "24px 20px",
  },
  stepTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    margin: "0 0 8px",
    letterSpacing: "-0.01em",
  },
  stepBody: {
    color: "#9a9aa5",
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
  },
  sectionNoPaddingBottom: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "64px 24px 40px",
  },
  testimonialsMarquee: {
    padding: "0 0 14px",
  },
  testimonialsMarqueeSecondRow: {
    padding: "0 0 64px",
  },
  testimonialCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    width: 320,
    flexShrink: 0,
  },
  testimonialQuote: {
    color: "#c4c4cc",
    fontSize: 13.5,
    lineHeight: 1.6,
    margin: "0 0 18px",
  },
  testimonialAuthor: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: "auto",
  },
  testimonialAvatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    objectFit: "cover",
    background: "rgba(255,255,255,0.05)",
    flexShrink: 0,
  },
  testimonialName: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: 600,
  },
  testimonialHandle: {
    color: "#6b6b78",
    fontSize: 12,
    marginTop: 1,
  },
  faqList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxWidth: 720,
    margin: "0 auto",
  },
  faqItem: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
  },
  faqQuestion: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "18px 20px",
    textAlign: "left",
  },
  faqQuestionText: {
    color: "#e4e4e9",
    fontSize: 14.5,
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  faqChevron: {
    flexShrink: 0,
    color: "#9a9aa5",
    transition: "transform 0.2s ease",
  },
  faqAnswer: {
    color: "#9a9aa5",
    fontSize: 13.5,
    lineHeight: 1.65,
    margin: 0,
    padding: "0 20px 20px",
  },
};