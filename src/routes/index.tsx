import { createFileRoute } from "@tanstack/react-router";
import GinExplorer from "@/components/GinExplorer";

const title = "The Ginistry Gin Explorer — 102 Gins in Oxted, Surrey";
const description =
  "Explore the gin menu at The Ginistry in Oxted, Surrey. Search and filter 102 gins by style, origin and flavour. Start a free passport to track your tastings.";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return <GinExplorer />;
}
