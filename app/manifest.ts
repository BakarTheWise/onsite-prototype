import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnSite Construction Workspace",
    short_name: "OnSite",
    description: "Construction project management for every site team.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f6",
    theme_color: "#171d19",
    icons: [
      {
        src: "/onsite-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/onsite-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
