import { createFileRoute } from "@tanstack/react-router";
import GinExplorer from "@/components/GinExplorer";
import { fetchGins } from "@/lib/gins.functions";
import { GINS } from "@/data/gins";

const title = "The Ginistry Gin Explorer — Gin Menu in Oxted, Surrey";
const description =
  "Explore the gin menu at The Ginistry in Oxted, Surrey. Search and filter every gin by style, origin and flavour. Start a free passport to track your tastings.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => fetchGins(),
  staleTime: 60_000,
  component: Index,
  errorComponent: () => (
    <div style={{ padding: 24, fontFamily: "'Cormorant Garamond', serif", color: "#f5ede0" }}>
      We couldn't load the gin menu. Please refresh.
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 24 }}>Nothing here.</div>,
});

function Index() {
  const data = Route.useLoaderData();
  return <GinExplorer gins={data?.gins ?? GINS} />;
}
