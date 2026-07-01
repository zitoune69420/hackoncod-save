import type { NextConfig } from "next";

/**
 * CSP en mode report-only : rien n’est bloqué ; les violations apparaissent
 * dans la console navigateur / endpoint de report si tu en configures un.
 * Pour durcir plus tard : retirer -Report-Only et resserrer script-src (nonces).
 */
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' https:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    domains: ["hackoncod.com", "i.imgur.com"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
