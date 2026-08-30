import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Moly — Personal AI Assistant",
    short_name: "Moly",
    description:
      "Agentic daily planner: tasks, calendar, and an assistant that runs them.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["productivity"],
    // ponytail: SVG covers every install target except iOS, which reads the
    // <link rel="apple-touch-icon"> that app/apple-icon.tsx generates.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
