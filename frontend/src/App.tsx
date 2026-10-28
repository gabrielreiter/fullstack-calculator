import Calculator from "./components/Calculator";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#calculator">
        Skip to calculator
      </a>
      <div className="page-shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="Clear calculator home">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            clear<span className="brand-period">.</span>
          </a>
          <span className="header-note">A little less mental math.</span>
        </header>

        <main className="workspace">
          <section className="intro" aria-labelledby="page-title">
            <p className="eyebrow">
              <span aria-hidden="true" /> THE EVERYDAY CALCULATOR
            </p>
            <h1 id="page-title">
              Everyday math.
              <br />
              <span>Made simple.</span>
            </h1>
            <p className="intro-copy">
              A quick sum, an even split, a little clarity. Two numbers are all
              you need.
            </p>
            <div className="intro-rule" />
            <p className="how-it-works">
              Pick an operation.
              <br />
              Enter your numbers.
              <br />
              <strong>We’ll take it from there.</strong>
            </p>
            <div className="keyboard-tip">
              <span className="keyboard-icon" aria-hidden="true">
                ↵
              </span>
              <p>
                Keep your flow.
                <br />
                <span>Press Enter to calculate.</span>
              </p>
            </div>
          </section>

          <Calculator />
        </main>

        <footer className="site-footer">
          <span>Small calculations. Clear answers.</span>
          <span>Add. Subtract. Multiply. Divide.</span>
        </footer>
      </div>
    </>
  );
}
