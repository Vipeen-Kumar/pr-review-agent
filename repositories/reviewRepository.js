import Review from "../models/Review.js";

/**
 * Review Repository
 * 
 * Handles all review-related persistence operations.
 * Pure CRUD layer - no business logic.
 * Data access abstraction for reviews collection.
 * Uses Mongoose for MongoDB operations.
 */

async function saveReview(review) {
  const newReview = new Review(review);
  const saved = await newReview.save();
  return saved.toObject();
}

async function findReviewById(reviewId) {
  const review = await Review.findOne({ id: reviewId }).lean();
  return review || null;
}

async function findReviewsByUserId(userId) {
  const reviews = await Review.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
  return reviews;
}

async function listReviews() {
  const reviews = await Review.find({}).lean();
  return reviews;
}

async function updateReview(reviewId, updates) {
  const updated = await Review.findOneAndUpdate(
    { id: reviewId },
    updates,
    { new: true, runValidators: true }
  ).lean();
  return updated || null;
}

export {
  saveReview,
  findReviewById,
  findReviewsByUserId,
  listReviews,
  updateReview,
};
