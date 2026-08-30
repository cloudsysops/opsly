import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acme Franchise Portal",
    short_name: "STC Franchise",
    description: "Franchise management portal for Acme Franchise",
    start_url: "/portal/my-franchise",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2D2F8E",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/logo/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
