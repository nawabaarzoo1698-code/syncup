/**
 * Lightweight validation middleware — no external libraries needed.
 * Validates POST /feed body fields and attaches sanitized values.
 */
const ALLOWED_CATEGORIES = ["mindset", "nutrition", "training", "recovery", "general"];

const validateFeedPost = (req, res, next) => {
  const errors = [];
  const { title, content, author, category, tags, isPinned } = req.body;

  // ─── Required fields ───────────────────────────────────────────
  if (!title || typeof title !== "string" || !title.trim()) {
    errors.push("title is required and must be a non-empty string.");
  } else if (title.trim().length > 200) {
    errors.push("title cannot exceed 200 characters.");
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    errors.push("content is required and must be a non-empty string.");
  } else if (content.trim().length > 5000) {
    errors.push("content cannot exceed 5000 characters.");
  }

  if (!author || typeof author !== "string" || !author.trim()) {
    errors.push("author is required and must be a non-empty string.");
  } else if (author.trim().length > 100) {
    errors.push("author cannot exceed 100 characters.");
  }

  // ─── Optional fields ────────────────────────────────────────────
  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`);
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
      errors.push("tags must be an array of strings.");
    } else if (tags.length > 10) {
      errors.push("tags cannot have more than 10 entries.");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Attach sanitized body for the route handler
  req.validatedBody = {
    title: title.trim(),
    content: content.trim(),
    author: author.trim(),
    category: category || "general",
    tags: (tags || []).map((t) => t.trim().toLowerCase()),
    isPinned: Boolean(isPinned),
  };

  next();
};

module.exports = { validateFeedPost };
