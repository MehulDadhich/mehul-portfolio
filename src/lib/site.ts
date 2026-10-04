/** Set NEXT_PUBLIC_SITE_URL to the deployed domain so canonical, OG and sitemap URLs are absolute. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const siteTitle = "Mehul Dadhich | AI/ML Engineer";
export const siteDescription =
  "Mehul Dadhich is an AI/ML engineer working across computer vision, NLP and LLM-powered agents, taking models from training and evaluation to optimised inference and production APIs.";
