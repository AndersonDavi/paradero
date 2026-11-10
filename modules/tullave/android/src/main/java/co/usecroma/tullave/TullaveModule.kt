package co.usecroma.tullave

import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.nfc.NfcAdapter
import android.os.Build
import android.nfc.Tag
import android.nfc.tech.IsoDep
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class Prompts : Record {
  @Field val hold: String = ""
}

private const val SHORTCUT = "co.usecroma.paradero.card"

private object Command {
  val selectApp = bytes(0x00, 0xA4, 0x04, 0x00, 0x07, 0xD4, 0x10, 0x00, 0x00, 0x03, 0x00, 0x01)
  val balance = bytes(0x90, 0x4C, 0x00, 0x00, 0x04)
  val purse = bytes(0x00, 0xB0, 0x86, 0x00, 0x42)
  val selectCard = bytes(0x00, 0xA4, 0x00, 0x00, 0x02, 0x42, 0x00)
  fun record(n: Int) = bytes(0x00, 0xB2, n, 0x24, 0x2E)
  private fun bytes(vararg values: Int) = ByteArray(values.size) { values[it].toByte() }
}

class TullaveModule : Module() {
  private var pending: Promise? = null

  private val adapter: NfcAdapter?
    get() = appContext.reactContext?.let { NfcAdapter.getDefaultAdapter(it) }

  override fun definition() = ModuleDefinition {
    Name("Tullave")

    Events("onShortcut")

    Function("takeShortcut") {
      val intent = appContext.currentActivity?.intent ?: return@Function null
      if (intent.action != SHORTCUT) return@Function null
      intent.action = Intent.ACTION_MAIN
      SHORTCUT
    }

    Function("setShortcut") { title: String ->
      val context = appContext.reactContext ?: return@Function
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return@Function
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return@Function
      launch.action = SHORTCUT
      launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      val shortcut = ShortcutInfo.Builder(context, "card")
        .setShortLabel(title)
        .setLongLabel(title)
        .setIcon(Icon.createWithResource(context, context.applicationInfo.icon))
        .setIntent(launch)
        .build()
      runCatching { context.getSystemService(ShortcutManager::class.java)?.dynamicShortcuts = listOf(shortcut) }
    }

    OnNewIntent { intent ->
      if (intent.action == SHORTCUT) {
        intent.action = Intent.ACTION_MAIN
        sendEvent("onShortcut", mapOf("type" to SHORTCUT))
      }
    }

    Function("isAvailable") {
      adapter?.isEnabled == true
    }

    AsyncFunction("read") { _: Prompts, promise: Promise ->
      val activity = appContext.currentActivity
      val nfc = adapter
      if (activity == null || nfc == null || !nfc.isEnabled) {
        promise.reject("unsupported", "This phone cannot read cards.", null)
        return@AsyncFunction
      }
      pending?.reject("cancelled", "cancelled", null)
      pending = promise
      val flags = NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK
      nfc.enableReaderMode(activity, { tag -> onTag(tag) }, flags, null)
    }

    Function("cancel") {
      stop()
      pending?.reject("cancelled", "cancelled", null)
      pending = null
    }

    OnActivityEntersBackground {
      stop()
      pending?.reject("cancelled", "cancelled", null)
      pending = null
    }
  }

  private fun onTag(tag: Tag) {
    val promise = pending ?: return
    val iso = IsoDep.get(tag)
    if (iso == null) {
      promise.reject("not_tullave", "not_tullave", null)
    } else {
      try {
        iso.timeout = 5000
        iso.connect()
        val app = iso.exchange(Command.selectApp)
        if (!app.endsWith("9000")) {
          promise.reject("not_tullave", "not_tullave", null)
        } else {
          val card = mapOf(
            "balance" to iso.exchange(Command.balance),
            "purse" to iso.exchange(Command.purse),
            "card" to iso.exchange(Command.selectCard),
            "records" to (1..10).map { runCatching { iso.exchange(Command.record(it)) }.getOrNull() },
          )
          promise.resolve(card)
        }
      } catch (error: Exception) {
        promise.reject("lost", "lost", error)
      } finally {
        runCatching { iso.close() }
      }
    }
    pending = null
    stop()
  }

  private fun stop() {
    val activity = appContext.currentActivity ?: return
    runCatching { adapter?.disableReaderMode(activity) }
  }

  private fun IsoDep.exchange(command: ByteArray): String =
    transceive(command).joinToString("") { "%02x".format(it) }
}
