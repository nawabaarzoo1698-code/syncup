import "../styles/globals.css";
import Link from "next/link";
import { useRouter } from "next/router";

function Navbar() {
  const router = useRouter();

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <span className="navbar__logo">
          Sync<span>Up</span>
        </span>
        <div className="navbar__links">
          <Link href="/" className={`navbar__link ${router.pathname === "/" ? "active" : ""}`}>
            Feed
          </Link>
          <Link href="/admin" className={`navbar__link ${router.pathname === "/admin" ? "active" : ""}`}>
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}
