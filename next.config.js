/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // The loading-screen duck is a fixed asset that only changes when it is
      // re-exported, so let browsers keep it instead of revalidating a ~1 MB
      // video on every cold navigation.
      {
        source: '/loading/:file*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=2592000',
          },
        ],
      },
      {
        // Deny framing by default. The previous `/:tenantSlug*` pattern matched
        // every path, so the login page and dashboard were embeddable by any
        // site — clickjacking on a form that takes credentials.
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none';",
          },
        ],
      },
      // The two embeddable tenant routes opt back in. Later rules win for the
      // same header key, so these override the defaults above on these paths
      // only. Modern browsers honour CSP frame-ancestors over X-Frame-Options.
      {
        source: '/:tenantSlug/widget',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *;',
          },
        ],
      },
      {
        source: '/:tenantSlug/request',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *;',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
