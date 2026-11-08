import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePalette } from "@/theme/colors";
import { layout, size, space } from "@/theme/tokens";

import { Button } from "./button";
import { StopSignGlyph } from "./glyphs";
import { Text } from "./text";
import { Tile } from "./tile";

export function Empty({ title, body, action, onAction, art }: { title: string; body?: string; action?: string; onAction?: () => void; art?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.box}>
      <View style={styles.art}>
        <Tile tier="xl">{art ?? <StopSignGlyph size={size.glyph.xl} color={p.faint} cut={p.surface} />}</Tile>
      </View>
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      {body && (
        <Text variant="callout" tone="muted" style={[styles.center, styles.body]}>
          {body}
        </Text>
      )}
      {action && onAction && (
        <View style={styles.action}>
          <Button label={action} onPress={onAction} height="md" hug />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", paddingHorizontal: space[6], paddingVertical: space[8], gap: space[2] },
  art: { marginBottom: space[2] },
  center: { textAlign: "center" },
  body: { maxWidth: layout.readable },
  action: { marginTop: space[3] },
});
