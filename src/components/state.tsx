import { PressableScale } from "pressto";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

import { StopSignGlyph } from "./glyphs";
import { Text } from "./text";

export function Empty({ title, body, action, onAction, art }: { title: string; body?: string; action?: string; onAction?: () => void; art?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.box}>
      <View style={[styles.art, { backgroundColor: p.surface }]}>{art ?? <StopSignGlyph size={30} color={p.faint} cut={p.surface} />}</View>
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      {body && (
        <Text variant="callout" tone="muted" style={[styles.center, { maxWidth: 320 }]}>
          {body}
        </Text>
      )}
      {action && onAction && (
        <PressableScale accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={[styles.button, { backgroundColor: p.ink }]}>
          <Text variant="headline" tone="inverse">
            {action}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl, paddingVertical: space.xxl, gap: space.sm },
  art: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  center: { textAlign: "center" },
  button: { marginTop: space.md, paddingHorizontal: space.xl, paddingVertical: 14, borderRadius: radius.pill },
});
