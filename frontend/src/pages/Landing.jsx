import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CROPS = [
  { name: 'Apple', emoji: '🍎' }, { name: 'Blueberry', emoji: '🫐' },
  { name: 'Cherry', emoji: '🍒' }, { name: 'Corn', emoji: '🌽' },
  { name: 'Grape', emoji: '🍇' }, { name: 'Orange', emoji: '🍊' },
  { name: 'Peach', emoji: '🍑' }, { name: 'Bell Pepper', emoji: '🫑' },
  { name: 'Potato', emoji: '🥔' }, { name: 'Raspberry', emoji: '🍓' },
  { name: 'Soybean', emoji: '🌱' }, { name: 'Squash', emoji: '🎃' },
  { name: 'Strawberry', emoji: '🍓' }, { name: 'Tomato', emoji: '🍅' },
];

const STATS = [
  { value: 54000, label: 'Images Trained', suffix: '+' },
  { value: 38, label: 'Disease Classes', suffix: '' },
  { value: 14, label: 'Crop Types', suffix: '' },
  { value: 98.5, label: 'Accuracy Rate', suffix: '%' },
];

function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
    }, { threshold: 0.15, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function CountUp({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const isFloat = !Number.isInteger(end);
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(isFloat ? parseFloat(start.toFixed(1)) : Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return <span ref={ref}>{isNaN(count) ? 0 : count.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [heroVisible, setHeroVisible] = useState(false);
  const [stepsRef, stepsInView] = useInView();
  const [cropsRef, cropsInView] = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing">
      {/* ─── Navbar ─── */}
      <nav className="landing-nav">
        <Link to="/" className="landing-nav__brand">
          <span>🌿</span> AgroScan
        </Link>
        <div className="landing-nav__right">
          {isAuthenticated ? (
            <Link to="/home" className="landing-nav__btn landing-nav__btn--filled">
              Go to App
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-nav__btn landing-nav__btn--outline">
                Login
              </Link>
              <Link to="/signup" className="landing-nav__btn landing-nav__btn--filled">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="landing-hero">
        <div className="landing-hero__inner">
          <div className={`landing-hero__content ${heroVisible ? 'visible' : ''}`}>
            <span className="landing-hero__pill">🌿 AI-Powered Plant Health</span>
            <h1 className="landing-hero__title">
              Protect Your Crops.<br />Detect Disease Instantly.
            </h1>
            <p className="landing-hero__subtitle">
              AgroScan uses advanced AI to identify crop diseases from a single leaf photo.
              Get accurate diagnosis and treatment recommendations in under 3 seconds.
            </p>
            <div className="landing-hero__ctas">
              <Link to="/signup" className="landing-hero__cta landing-hero__cta--primary">
                Start Scanning Free →
              </Link>
              <a href="#how-it-works" className="landing-hero__cta landing-hero__cta--secondary">
                See How It Works
              </a>
            </div>
            <div className="landing-hero__trust">
              <span>✓ 38 Disease Classes</span>
              <span>✓ 98.5% Accuracy</span>
              <span>✓ Free to Use</span>
            </div>
          </div>

          {/* Mockup card */}
          <div className={`landing-hero__mockup ${heroVisible ? 'visible' : ''}`}>
            <div className="mockup-card">
              <div className="mockup-card__header">
                <span className="mockup-card__icon">🔬</span>
                <span className="mockup-card__label">Scan Result</span>
              </div>
              <div className="mockup-card__leaf">🍃</div>
              <div className="mockup-card__crop">Tomato</div>
              <div className="mockup-card__disease">
                <span className="mockup-card__badge">Disease Detected</span>
              </div>
              <div className="mockup-card__condition">Early Blight</div>
              <div className="mockup-card__conf-row">
                <span>Confidence</span>
                <span className="mockup-card__conf-val">97.4%</span>
              </div>
              <div className="mockup-card__bar-track">
                <div className="mockup-card__bar-fill" style={{ width: '97.4%' }}></div>
              </div>
              <div className="mockup-card__status">
                <span className="mockup-card__dot"></span>
                Analyzed in 1.2s
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="landing-stats">
        <div className="landing-stats__grid">
          {STATS.map((s) => (
            <div className="landing-stats__item" key={s.label}>
              <div className="landing-stats__number">
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div className="landing-stats__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="landing-section" id="how-it-works">
        <h2 className="landing-section__title">How AgroScan Works</h2>
        <p className="landing-section__subtitle">
          Three simple steps to diagnose crop diseases with AI
        </p>
        <div className="landing-steps" ref={stepsRef}>
          {[
            { num: 1, icon: '📸', title: 'Upload a Leaf Photo', desc: 'Take a clear photo of the affected leaf and upload it through our simple drag-and-drop interface.' },
            { num: 2, icon: '🤖', title: 'AI Analyses the Image', desc: 'Our EfficientNetB0 deep learning model analyses the leaf and identifies the disease with 98.5% accuracy.' },
            { num: 3, icon: '💊', title: 'Get Treatment Plan', desc: 'Receive a detailed diagnosis with organic and chemical treatment recommendations instantly.' },
          ].map((step, i) => (
            <div
              className={`landing-step ${stepsInView ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
              key={step.num}
            >
              <div className="landing-step__num">{step.num}</div>
              <div className="landing-step__icon">{step.icon}</div>
              <h3 className="landing-step__title">{step.title}</h3>
              <p className="landing-step__desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Supported Crops ─── */}
      <section className="landing-section landing-section--alt">
        <h2 className="landing-section__title">Supported Crops</h2>
        <p className="landing-section__subtitle">
          AgroScan can detect diseases across 14 crop types
        </p>
        <div className="landing-crops" ref={cropsRef}>
          {CROPS.map((c, i) => (
            <span
              className={`landing-crop-pill ${cropsInView ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.04}s` }}
              key={c.name}
            >
              {c.emoji} {c.name}
            </span>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="landing-cta">
        <h2 className="landing-cta__title">Ready to Protect Your Crops?</h2>
        <p className="landing-cta__subtitle">
          Join thousands of farmers using AI to save their harvests.
        </p>
        <Link to="/signup" className="landing-cta__btn">
          Create Free Account
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="landing-footer__brand">🌿 AgroScan</div>
        <div className="landing-footer__copy">
          © 2025 AgroScan · SDG 2: Zero Hunger · SDG 9: Innovation · SDG 15: Life on Land
        </div>
      </footer>
    </div>
  );
}
