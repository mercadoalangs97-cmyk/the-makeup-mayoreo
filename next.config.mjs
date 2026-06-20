/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yekvehkmgunoafccwmyp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // La tienda AMAREA se movió de /shop a /amarea (mantener links indexados)
      { source: "/shop", destination: "/amarea", permanent: true },
      { source: "/shop/:sku", destination: "/amarea/:sku", permanent: true },
    ];
  },
};

export default nextConfig;
