import ExpoModulesCore
import UIKit

extension Notification.Name {
  static let paraderoShortcut = Notification.Name("ParaderoShortcut")
}

/// Holds the Home Screen quick action until JavaScript asks for it, so a cold start doesn't lose it.
enum Shortcut {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var value: String?

  static func hold(_ type: String) {
    lock.withLock { value = type }
  }

  static func take() -> String? {
    lock.withLock {
      defer { value = nil }
      return value
    }
  }
}

public class ShortcutAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    Shortcut.hold(shortcutItem.type)
    NotificationCenter.default.post(name: .paraderoShortcut, object: shortcutItem.type)
    completionHandler(true)
  }
}
