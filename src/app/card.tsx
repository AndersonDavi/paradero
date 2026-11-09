import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Icon, icons } from "@/components/icon";
import { Empty } from "@/components/state";
import { Text } from "@/components/text";
import { Tile } from "@/components/tile";
import { useT } from "@/i18n";
import { announce, useLargeText } from "@/lib/accessibility";
import { clock } from "@/lib/format";
import { canReadCards, cancelRead, cardTime, pesos, readCard, ReadError } from "@/lib/tullave";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";
import { groupNumber, type Card, type Movement } from "@/transit/tullave";

const SIGN: Record<Movement["kind"], string> = { trip: "−", topup: "+", topupCancelled: "−", other: "" };

export default function CardScreen() {
  const p = usePalette();
  const t = useT();
  const [supported] = useState(canReadCards);
  const [result, setResult] = useState<{ card: Card; at: string } | null>(null);

  const read = useMutation({
    mutationFn: async () => {
      try {
        return { card: await readCard(), at: new Date().toISOString() };
      } catch (error) {
        if (error instanceof ReadError && error.code === "cancelled") return null;
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data) return;
      setResult(data);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      announce(t.card.speech.balance(pesos(data.card.balance)));
    },
    onError: (error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      announce(failureOf(error, t).title);
    },
  });

  useEffect(() => cancelRead, []);

  const failure = read.error ? failureOf(read.error, t) : null;

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Text variant="title" style={styles.grow}>
          {t.card.screen}
        </Text>
        <Button variant="quiet" height="md" hug label={t.common.close} onPress={() => router.back()} />
      </View>

      {!supported && <Empty title={t.card.errors.unsupported.title} body={t.card.errors.unsupported.body} art={<Icon name={icons.contactless} color={p.faint} size="lg" />} />}

      {supported && !result && (
        <View style={styles.hero}>
          <Tile tier="xl">
            <Icon name={icons.contactless} color={p.text} size="lg" />
          </Tile>
          <Text variant="heading" style={styles.center}>
            {t.card.title}
          </Text>
          <Text variant="callout" tone="muted" style={[styles.center, styles.readable]}>
            {process.env.EXPO_OS === "android" ? t.card.intro.android : t.card.intro.ios}
          </Text>
        </View>
      )}

      {failure && (
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.failure, { backgroundColor: p.surface }]}>
          <Text variant="headline" weight={600}>
            {failure.title}
          </Text>
          <Text variant="callout" tone="muted">
            {failure.body}
          </Text>
        </View>
      )}

      {result && <Result balance={result.card.balance} number={result.card.number} movements={result.card.movements} at={result.at} />}

      {supported && (
        <Button
          variant={result ? "secondary" : "primary"}
          label={read.isPending ? t.card.reading : result || failure ? t.card.again : t.card.read}
          disabled={read.isPending}
          onPress={() => read.mutate()}
        />
      )}

      <View style={styles.note}>
        <Icon name={icons.lock} color={p.faint} size="xs" />
        <Text variant="caption" tone="muted" style={styles.grow}>
          {t.card.private}
        </Text>
      </View>
    </ScrollView>
  );
}

function Result({ balance, number, movements, at }: { balance: number; number: string; movements: Movement[]; at: string }) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={styles.result}>
      <View accessible accessibilityLabel={`${t.card.speech.balance(pesos(balance))} ${t.card.readAt(clock(at))}`} style={styles.balance}>
        <Text variant="eyebrow" tone="faint">
          {t.card.balance}
        </Text>
        <Text variant="hero" tabular>
          {pesos(balance)}
        </Text>
        <Text variant="caption" tone="muted">
          {t.card.readAt(clock(at))}
        </Text>
      </View>

      <View style={styles.note}>
        <Icon name={icons.info} color={p.faint} size="xs" />
        <Text variant="caption" tone="muted" style={styles.grow}>
          {t.card.pending}
        </Text>
      </View>

      {number !== "" && (
        <View style={styles.block}>
          <Text variant="eyebrow" tone="faint">
            {t.card.number}
          </Text>
          <Text variant="headline" tabular accessibilityLabel={`${t.card.number}: ${number.split("").join(" ")}`}>
            {groupNumber(number)}
          </Text>
        </View>
      )}

      <View style={styles.block}>
        <Text variant="eyebrow" tone="faint" accessibilityRole="header">
          {t.card.movements}
        </Text>
        {movements.length === 0 && (
          <Text variant="callout" tone="muted">
            {t.card.noMovements}
          </Text>
        )}
        {movements.map((m, i) => (
          <MovementRow key={`${m.at ?? i}-${i}`} movement={m} first={i === 0} />
        ))}
      </View>
    </View>
  );
}

function MovementRow({ movement, first }: { movement: Movement; first: boolean }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const kind = t.card.kinds[movement.kind];
  const amount = `${SIGN[movement.kind]}${pesos(movement.amount)}`;
  const when = movement.at ? cardTime(movement.at) : "";
  const after = pesos(movement.balanceAfter);

  return (
    <View
      accessible
      accessibilityLabel={t.card.speech.movement(kind, pesos(movement.amount), when, after)}
      style={[styles.row, large && styles.stack, !first && { borderTopWidth: size.line.hair, borderTopColor: p.border }]}>
      <View style={styles.grow}>
        <Text variant="headline">{kind}</Text>
        {when !== "" && (
          <Text variant="caption" tone="muted">
            {when}
          </Text>
        )}
      </View>
      <View style={large ? undefined : styles.end}>
        <Text variant="headline" tabular>
          {amount}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {t.card.after(after)}
        </Text>
      </View>
    </View>
  );
}

function failureOf(error: unknown, t: ReturnType<typeof useT>) {
  const code = error instanceof ReadError && error.code !== "cancelled" ? error.code : "failed";
  return t.card.errors[code];
}

const styles = StyleSheet.create({
  content: { padding: layout.gutter, paddingTop: space[6], gap: space[5], paddingBottom: layout.screenEnd },
  top: { flexDirection: "row", alignItems: "center", gap: space[2] },
  grow: { flex: 1 },
  hero: { alignItems: "center", gap: space[3], paddingVertical: space[6] },
  center: { textAlign: "center" },
  readable: { maxWidth: layout.readable },
  failure: { padding: space[4], borderRadius: radius.lg, borderCurve: "continuous", gap: space[1] },
  result: { gap: space[5] },
  balance: { gap: space[1] },
  block: { gap: space[2] },
  note: { flexDirection: "row", gap: space[2], alignItems: "flex-start" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[3], paddingVertical: space[3] },
  stack: { flexDirection: "column", gap: space[1] },
  end: { alignItems: "flex-end" },
});
