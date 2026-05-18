import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Error.module.css";

export default function ServerError() {
  return (
    <>
      <Head>
        <title>500 — Server Error | SyncUp</title>
      </Head>
      <main className={styles.main}>
        <div className={styles.code}>500</div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.sub}>The server encountered an error. Please try again.</p>
        <Link href="/" className={styles.btn}>← Back to Feed</Link>
      </main>
    </>
  );
}
