/**
 * Absolute site URL for canonical links, Open Graph images and the sitemap.
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel's production domain → the known live URL
 * in production builds → localhost in development.
 */
const PRODUCTION_URL = "https://mehul-portfolio-inky.vercel.app";

function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl().replace(/\/$/, "");

export const siteTitle = "Mehul Dadhich | AI/ML Engineer";
export const siteDescription =
  "Mehul Dadhich is an AI/ML engineer working across computer vision, NLP and LLM-powered agents, taking models from training and evaluation to optimised inference and production APIs.";
