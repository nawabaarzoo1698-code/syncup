const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const FeedSchema = new mongoose.Schema(
  {
    // Stable, collision-resistant ID used by the frontend for deduplication
    eventId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [5000, "Content cannot exceed 5000 characters"],
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      maxlength: [100, "Author name cannot exceed 100 characters"],
    },
    category: {
      type: String,
      enum: ["mindset", "nutrition", "training", "recovery", "general"],
      default: "general",
    },
    tags: {
      type: [String],
      default: [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    // Lean queries by default for read performance
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for sorted pagination
FeedSchema.index({ isPinned: -1, createdAt: -1 });

// Text index for future search
FeedSchema.index({ title: "text", content: "text" });

const Feed = mongoose.model("Feed", FeedSchema);

module.exports = Feed;
