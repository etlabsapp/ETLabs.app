import Link from "next/link";

export default function HomeMain() {
  return (
    <main id="top">
      <section className="hero section">
        <div className="container hero-grid">
          <div className="hero-copy reveal">
            <p className="eyebrow">Intentional software studio</p>
            <h1>Software should support life, not consume it.</h1>
            <p className="hero-text">
              ET Labs builds calm, focused software that helps people accomplish meaningful things — then return to
              their lives. No infinite feeds. No engagement tricks. Just useful tools with a clear end.
            </p>
            <div className="hero-actions">
              <a href="#products" className="primary-button">
                Explore products
              </a>
              <a href="#philosophy" className="secondary-button">
                Read the philosophy
              </a>
            </div>
            <div className="hero-points">
              <span>Finishable experiences</span>
              <span>Calm, quiet interfaces</span>
              <span>Respect for attention</span>
            </div>
          </div>

          <div className="hero-card card reveal reveal-delay">
            <p className="card-label">Studio principle</p>
            <h2>Technology should do its job — then get out of the way.</h2>
            <p>
              ET Labs products are designed to reduce noise, support focus, and help people move on with clarity.
            </p>
            <div className="principle-list">
              <div className="principle-item">Purpose before engagement</div>
              <div className="principle-item">Calm by default</div>
              <div className="principle-item">Focused interaction</div>
              <div className="principle-item">Designed to be left</div>
            </div>
          </div>
        </div>
      </section>

      <section className="hero-product-strip" aria-label="Flagship product">
        <div className="container hero-product-strip-inner">
          <div className="hero-product-strip-visual card reveal">
            <div className="hero-sleeptight-glow" />
            <div className="hero-sleeptight-device">
              <img
                src="/apps/sleeptight/images/hero-phone.webp"
                alt="SleepTight: DreamWrite on iPhone"
                className="hero-sleeptight-phone"
                width={520}
                height={1040}
                loading="lazy"
              />
            </div>
            <p className="hero-sleeptight-caption">Nighttime-native, calm by design</p>
          </div>
          <div className="hero-product-strip-copy reveal">
            <p className="eyebrow">Flagship app</p>
            <h2 className="hero-product-strip-title">SleepTight: DreamWrite</h2>
            <p className="hero-product-strip-status">Submitted to the Apple App Store · listing live soon</p>
            <p className="section-text hero-product-strip-lead">
              Sleep and nap guidance designed to help people rest better—healthier routines without another screen
              that keeps you awake. Calm interface, finishable flow, privacy-first.
            </p>
            <div className="hero-strip-chips">
              <span className="featured-chip">Real alarms &amp; naps</span>
              <span className="featured-chip">Guided rituals</span>
              <span className="featured-chip">DreamWrite in SleepTight+</span>
            </div>
            <div className="hero-actions">
              <Link href="/apps/sleeptight/index.html" className="primary-button">
                Product details
              </Link>
              <Link href="/apps/sleeptight/index.html#app-store" className="secondary-button">
                App Store status
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section philosophy-section" id="philosophy">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">Philosophy</p>
            <h2 className="section-title">A quieter approach to software.</h2>
            <p className="section-text">
              ET Labs believes technology should help people do something useful, clearly and intentionally, without
              overwhelming them in the process.
            </p>
          </div>

          <div className="three-up-grid">
            <article className="feature-card card reveal">
              <div className="feature-number">01</div>
              <div className="principle-icon" />
              <h3>Finishable experiences</h3>
              <p>Software that helps people complete something clearly and intentionally — and then step away.</p>
            </article>

            <article className="feature-card card reveal reveal-delay">
              <div className="feature-number">02</div>
              <div className="principle-icon" />
              <h3>Respect for attention</h3>
              <p>Products designed without endless engagement loops, unnecessary prompts, or attention traps.</p>
            </article>

            <article className="feature-card card reveal reveal-delay-2">
              <div className="feature-number">03</div>
              <div className="principle-icon" />
              <h3>Calm by design</h3>
              <p>Minimal interfaces, restrained visuals, and thoughtful pacing that reduce digital noise.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section featured-product" id="products">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">Products</p>
            <h2 className="section-title">Focused products with a clear purpose.</h2>
            <p className="section-text">
              Each ET Labs product is designed to solve something specific, elegantly, and without asking for more
              attention than it deserves.
            </p>
          </div>

          <div className="products-showcase">
            <article className="featured-card card reveal product-card-home product-sleeptight-featured">
              <div className="product-featured-split">
                <div className="product-featured-media">
                  <img
                    src="/apps/sleeptight/images/screenshot-01-home.webp"
                    alt="SleepTight sleep planner"
                    width={600}
                    height={1200}
                    loading="lazy"
                  />
                </div>
                <div className="product-featured-copy">
                  <p className="featured-tag">Featured</p>
                  <p className="card-label">Submitted to the App Store</p>
                  <h3 className="featured-title">SleepTight: DreamWrite</h3>
                  <p className="section-text">
                    Sleep timing intelligence, real alarms, naps, guided bedtime rituals, and private dream and
                    reflection journaling. Voice memos stay free; SleepTight+ adds DreamWrite—on-device transcription,
                    full archive beyond the free typed window, and transcript-backed search—plus Morning Score, Sleep
                    Debt, Ideal Bedtime Tonight, and Weekly Sleep Report.
                  </p>
                  <div className="featured-chips">
                    <span className="featured-chip">Calm interface</span>
                    <span className="featured-chip">Finishable flow</span>
                    <span className="featured-chip">Privacy-first</span>
                  </div>
                  <div className="split-actions">
                    <Link href="/apps/sleeptight/index.html" className="primary-button">
                      Product details
                    </Link>
                    <Link href="/apps/sleeptight/index.html#app-store" className="secondary-button">
                      App Store status
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            <div className="products-secondary-row products-secondary-row-single">
              <article className="featured-card card reveal reveal-delay product-card-home product-card-coming-soon product-card-secondary">
                <div className="featured-header">
                  <p className="card-label">Side experiment</p>
                  <h3 className="featured-title">FlipFeed</h3>
                  <p className="section-text">
                    A live split-flap board for displays and streams—separate from SleepTight, useful for post-launch
                    download experiments and fun demos.
                  </p>
                </div>
                <div className="featured-chips">
                  <span className="featured-chip">Split-flap animation</span>
                  <span className="featured-chip">Fullscreen mode</span>
                  <span className="featured-chip">JSON or mock feed</span>
                </div>
                <div className="split-actions">
                  <a href="https://etlabsflipfeed.vercel.app/" className="secondary-button">
                    Open FlipFeed
                  </a>
                </div>
              </article>
            </div>
          </div>

          <div className="split-actions products-cta reveal">
            <Link href="/products" className="secondary-button">
              See all products
            </Link>
            <Link href="/contact" className="secondary-button">
              Talk to ET Labs
            </Link>
          </div>
        </div>
      </section>

      <section className="section studio-section" id="studio">
        <div className="container">
          <article className="studio-card card reveal">
            <p className="eyebrow">Studio</p>
            <h2 className="section-title">ET Labs is building a portfolio of intentional software.</h2>
            <p className="section-text">
              <strong>SleepTight: DreamWrite</strong> is the studio’s flagship—sleep timing, rituals, and private
              journaling in one iPhone app. Smaller experiments like FlipFeed may follow, but the main focus is tools
              that finish cleanly.
            </p>
            <div className="split-actions">
              <a href="#products" className="secondary-button">
                See what ET Labs is building
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="about-studio">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">About the studio</p>
            <h2 className="section-title">Quiet, finishable software from a small independent shop.</h2>
            <p className="section-text">
              ET Labs focuses on a small number of calm, carefully designed products instead of a large catalog. Each
              release is meant to feel considered, human, and respectful of your time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
