import { readStore, writeStore } from "../storage/store.js";

/**
 * Review Repository
 * 
 * Handles all review-related persistence operations.
 * Pure CRUD layer - no business logic.
 * Data access abstraction for reviews collection.
 */

async function saveReview(review) {
  const store = await readStore();
  store.reviews.push(review);
  await writeStore(store);
  return review;
}

async function findReviewById(reviewId) {
  const store = await readStore();
  return store.reviews.find((review) => review.id === reviewId) || null;
}

async function findReviewsByUserId(userId) {
  const store = await readStore();
  return store.reviews
    .filter((review) => review.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listReviews() {
  const store = await readStore();
  return store.reviews;
}

async function updateReview(reviewId, updates) {
  const store = await readStore();
  const reviewIndex = store.reviews.findIndex((review) => review.id === reviewId);
  
  if (reviewIndex === -1) {
    return null;
  }

  const updatedReview = {
    ...store.reviews[reviewIndex],
    ...updates,
  };

  store.reviews[reviewIndex] = updatedReview;
  await writeStore(store);
  return updatedReview;
}

export {
  saveReview,
  findReviewById,
  findReviewsByUserId,
  listReviews,
  updateReview,
};
