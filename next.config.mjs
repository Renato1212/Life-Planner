/** @type {import('next').NextConfig} */
const isExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // Static export (GitHub Pages) build runs in local-only mode: no server,
  // no API routes, no middleware — the app persists to localStorage.
  ...(isExport
    ? {
        output: "export",
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
