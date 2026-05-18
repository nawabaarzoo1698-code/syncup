import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Admin.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CATEGORIES = ["general", "mindset", "nutrition", "training", "recovery"];

const INITIAL_FORM = {
  title: "",
  content: "",
  author: "",
  category: "general",
  tags: "",
  isPinned: false,
};

// ─── Admin page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errors, setErrors] = useState([]);
  const [lastPosted, setLastPosted] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    // Clear field-level errors on change
    if (errors.length) setErrors([]);
  };

  const validate = () => {
    const errs = [];
    if (!form.title.trim()) errs.push("Title is required.");
    if (!form.content.trim()) errs.push("Content is required.");
    if (!form.author.trim()) errs.push("Author is required.");
    if (form.title.trim().length > 200) errs.push("Title max 200 chars.");
    if (form.content.trim().length > 5000) errs.push("Content max 5000 chars.");
    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setStatus("submitting");
    setErrors([]);

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      author: form.author.trim(),
      category: form.category,
      tags: form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      isPinned: form.isPinned,
    };

    try {
      const res = await fetch(`${API_URL}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrors(json.errors || [json.message || "Server error"]);
        setStatus("error");
        return;
      }

      setLastPosted(json.data);
      setForm(INITIAL_FORM);
      setStatus("success");

      // Reset to idle after 4 s
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setErrors(["Network error — is the backend running?"]);
      setStatus("error");
    }
  };

  const charCount = (field, max) => {
    const len = form[field].length;
    return (
      <span className={len > max * 0.9 ? styles.charWarn : styles.charCount}>
        {len}/{max}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>Admin — SyncUp</title>
      </Head>

      <main className={styles.main}>
        <div className="container">
          {/* ── Header ── */}
          <div className="page-header">
            <p className="page-header__eyebrow">Admin Panel</p>
            <h1 className="page-header__title">Post an Update</h1>
            <p className="page-header__sub">
              Broadcast a coaching insight to all athletes in realtime
            </p>
          </div>

          <div className={styles.layout}>
            {/* ── Form ── */}
            <div className={styles.formCard}>
              {/* Title */}
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="title">Title</label>
                  {charCount("title", 200)}
                </div>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className={styles.input}
                  placeholder="E.g. Pre-season nutrition protocol"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={200}
                  disabled={status === "submitting"}
                  autoComplete="off"
                />
              </div>

              {/* Content */}
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="content">Content</label>
                  {charCount("content", 5000)}
                </div>
                <textarea
                  id="content"
                  name="content"
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Share your coaching insight, drill breakdown, or motivation…"
                  value={form.content}
                  onChange={handleChange}
                  maxLength={5000}
                  rows={6}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Author + Category row */}
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="author">Author</label>
                  <input
                    id="author"
                    name="author"
                    type="text"
                    className={styles.input}
                    placeholder="Coach name or team"
                    value={form.author}
                    onChange={handleChange}
                    maxLength={100}
                    disabled={status === "submitting"}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    className={styles.input}
                    value={form.category}
                    onChange={handleChange}
                    disabled={status === "submitting"}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="tags">
                  Tags <span className={styles.optional}>(comma-separated, optional)</span>
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. sprint, warmup, diet"
                  value={form.tags}
                  onChange={handleChange}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Pin toggle */}
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  name="isPinned"
                  className={styles.checkbox}
                  checked={form.isPinned}
                  onChange={handleChange}
                  disabled={status === "submitting"}
                />
                <span>Pin this update to the top of the feed</span>
              </label>

              {/* Errors */}
              {errors.length > 0 && (
                <div className={styles.errorBox} role="alert">
                  <p className={styles.errorTitle}>⚠ Please fix the following:</p>
                  <ul>
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success */}
              {status === "success" && (
                <div className={styles.successBox} role="status">
                  ✓ Update posted! Athletes are seeing it live right now.{" "}
                  <Link href="/" className={styles.viewLink}>
                    View feed →
                  </Link>
                </div>
              )}

              {/* Submit */}
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={status === "submitting"}
              >
                {status === "submitting" ? (
                  <>
                    <span className={styles.btnSpinner} />
                    Broadcasting…
                  </>
                ) : (
                  "Broadcast Update"
                )}
              </button>
            </div>

            {/* ── Live preview ── */}
            <div className={styles.preview}>
              <p className={styles.previewLabel}>Live Preview</p>
              <div className={styles.previewCard}>
                <p className={styles.previewCategory}>
                  {form.category || "general"}
                </p>
                <h3 className={styles.previewTitle}>
                  {form.title || "Your update title"}
                </h3>
                <p className={styles.previewContent}>
                  {form.content || "Your coaching content will appear here…"}
                </p>
                <p className={styles.previewAuthor}>— {form.author || "Author"}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
