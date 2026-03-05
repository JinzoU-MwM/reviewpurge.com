import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/indonesia",
    "/global",
    "/blog",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms-of-service",
    "/affiliate-disclosure",
  ];

  return staticRoutes.map((route) => ({
    url: `https://reviewpurge.com${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
