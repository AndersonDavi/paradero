import { ScrollView, StyleSheet } from "react-native";

import { Settings } from "@/components/settings";
import { layout, space } from "@/theme/tokens";

/** Settings on their own screen, reached from the gear on the map and from Public good. */
export default function SettingsScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Settings />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: layout.tabBarClearance },
});
