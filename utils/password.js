import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, existingHash] = stored.split(":");
  const computed = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(existingHash), Buffer.from(computed));
}

export { hashPassword, verifyPassword };
