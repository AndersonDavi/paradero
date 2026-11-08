import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { layout, space } from "@/theme/tokens";

/** A horizontal row of cards. It leaves room around the cards so their shadows are never cut off. */
export function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { marginVertical: -layout.shadowBleed },
  content: { paddingHorizontal: layout.gutter, paddingVertical: layout.shadowBleed, gap: space[3] },
});
