import { NativeModule, requireOptionalNativeModule } from "expo";

/** What the phone shows on its own card sheet (iOS), in the rider's language. */
export type ReadPrompts = {
  hold: string;
  reading: string;
  done: string;
  notCard: string;
  lost: string;
};

/** The card's raw answers as hex, status word included, exactly as the card sent them. */
export type CardResponses = {
  balance: string;
  purse: string;
  card: string;
  records: (string | null)[];
};

declare class TullaveModule extends NativeModule<{ onShortcut: (event: { type: string }) => void }> {
  isAvailable(): boolean;
  /** The Home Screen quick action that opened the app, once. */
  takeShortcut(): string | null;
  /** Android only: adds the long-press shortcut on the app icon. iOS declares it in Info.plist. */
  setShortcut?(title: string): void;
  read(prompts: ReadPrompts): Promise<CardResponses>;
  cancel?(): void;
}

/** Null on web and on builds made before the card reader existed. */
export default requireOptionalNativeModule<TullaveModule>("Tullave");
