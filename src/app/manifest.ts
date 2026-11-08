import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uniformity | BU Polangui Campus Marketplace",
    short_name: "Uniformity",
    description:
      "Buy and sell pre-loved uniforms, department shirts, and course equipment within Bicol University Polangui. Meet on campus, pay in cash.",
    id: "/",
    start_url: "/browse",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7faf4",
    theme_color: "#235823",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Browse listings", short_name: "Browse", url: "/browse" },
      { name: "Sell an item", short_name: "Sell", url: "/sell/new" },
      { name: "Wishlist", short_name: "Saved", url: "/wishlist" },
    ],
  };
}
