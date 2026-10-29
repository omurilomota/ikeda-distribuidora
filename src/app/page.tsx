import { getPortalData } from "@/lib/portal";
import Portal from "@/components/portal";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const data = await getPortalData();
  return <Portal initialData={data} />;
}
