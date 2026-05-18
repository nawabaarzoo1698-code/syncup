import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Error.module.css";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 — Page Not Found | SyncUp</title>
      </Head>
      <main className={styles.main}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.sub}>The page you're looking for doesn't exist.</p>
        <Link href="/" className={styles.btn}>← Back to Feed</Link>
      </main>
    </>
  );
}
