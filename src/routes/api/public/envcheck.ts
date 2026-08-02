import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/envcheck")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          hasKey: Boolean(process.env.LOVABLE_API_KEY),
          keys: Object.keys(process.env ?? {}).filter((k) => k.includes("LOVABLE")),
        });
      },
    },
  },
});
