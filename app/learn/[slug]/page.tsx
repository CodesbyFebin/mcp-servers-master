import { makeDynamicEntry } from "@/src/components/content/DynamicEntryPage";

const { generateStaticParams, generateMetadata, Page } = makeDynamicEntry("learn");

export { generateStaticParams, generateMetadata };

// Only registry-published slugs exist; everything else must 404.
export const dynamicParams = false;
export default Page;