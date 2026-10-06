/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sello de cada build: el panel del bot lo compara con el del servidor para recargarse solo
  // cuando hay versión nueva (una pestaña abierta días seguía mostrando el panel viejo).
  env: { PANEL_VERSION: String(Date.now()) },
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
