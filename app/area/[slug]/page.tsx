import { AreaClient } from "./AreaClient";

// The four seeded areas. Static export pre-renders these; the page itself is
// client-rendered and reads live data from the store.
const SLUGS = ["spiritual", "wealth", "health", "relationship"];

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export default function Page() {
  return <AreaClient />;
}
