import { TabStack } from "@/components/tab-stack";
import { useT } from "@/i18n";

export default function Layout() {
  return <TabStack title={useT().tabs.about} />;
}
