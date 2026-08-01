import { createFileRoute } from "@tanstack/react-router";
import GinExplorer from "@/components/GinExplorer";

const title = "The Ginistry Gin Explorer — Oxted, Surrey";
const description =
  "Track your journey through 102 gins at The Ginistry in Oxted, Surrey. Collect stamps, unlock milestones and keep your gin passport.";

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
