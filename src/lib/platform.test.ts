import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideBackAction, isExternalHref, NATIVE_APP_ORIGINS } from "./platform";

const IOS = "capacitor://localhost";
const ANDROID = "https://localhost";

describe("platform: external links", () => {
  it("opens mail, phone and other-origin links outside the app", () => {
    for (const origin of [IOS, ANDROID]) {
      assert.equal(isExternalHref("mailto:hi@example.com?subject=x", origin), true);
      assert.equal(isExternalHref("MAILTO:hi@example.com", origin), true);
      assert.equal(isExternalHref("tel:+15555550100", origin), true);
      assert.equal(isExternalHref("https://github.com/x/y/issues/new?title=Bug", origin), true);
      assert.equal(isExternalHref("http://example.com", origin), true);
    }
  });

  it("keeps in-app links inside the app", () => {
    assert.equal(isExternalHref("/app/trade", ANDROID), false);
    assert.equal(isExternalHref("https://localhost/privacy/", ANDROID), false);
    assert.equal(isExternalHref("#top", IOS), false);
    assert.equal(isExternalHref("/privacy/", IOS), false);
    assert.equal(isExternalHref("", IOS), false);
    assert.equal(isExternalHref(null, IOS), false);
  });

  it("ignores script/data/blob URLs (never handed to the system browser)", () => {
    assert.equal(isExternalHref("javascript:alert(1)", ANDROID), false);
    assert.equal(isExternalHref("data:text/html,hi", ANDROID), false);
    assert.equal(isExternalHref("blob:https://localhost/abc", ANDROID), false);
  });

  it("matches the worker's native origins", () => {
    assert.deepEqual([...NATIVE_APP_ORIGINS], ["capacitor://localhost", "https://localhost", "http://localhost"]);
  });
});

describe("platform: Android back button", () => {
  it("closes an open sheet/drawer first", () => {
    assert.equal(decideBackAction({ overlayOpen: true, canGoBack: true, path: "/app/trade/" }), "close-overlay");
    assert.equal(decideBackAction({ overlayOpen: true, canGoBack: false, path: "/app/" }), "close-overlay");
  });
  it("exits from the home screen", () => {
    assert.equal(decideBackAction({ overlayOpen: false, canGoBack: true, path: "/app/" }), "exit");
    assert.equal(decideBackAction({ overlayOpen: false, canGoBack: false, path: "/" }), "exit");
  });
  it("goes back in history, or home when there's no history", () => {
    assert.equal(decideBackAction({ overlayOpen: false, canGoBack: true, path: "/app/trade/" }), "history-back");
    assert.equal(decideBackAction({ overlayOpen: false, canGoBack: false, path: "/privacy/" }), "go-home");
  });
});

describe("accounts in the app-store build", () => {
  const full = { apiKey: "k", authDomain: "x.firebaseapp.com", projectId: "x", appId: "1:2:web:3" };
  it("are off unless Firebase is configured", async () => {
    const { accountsEnabledFor } = await import("./firebase");
    assert.equal(accountsEnabledFor({}, { target: "web" }), false);
    assert.equal(accountsEnabledFor(full, { target: "web" }), true);
  });
  it("stay off in the native build until native-compatible setup is opted into", async () => {
    const { accountsEnabledFor } = await import("./firebase");
    assert.equal(accountsEnabledFor(full, { target: "native" }), false);
    assert.equal(accountsEnabledFor(full, { target: "native", nativeFirebase: "true" }), true);
    assert.equal(accountsEnabledFor({}, { target: "native", nativeFirebase: "true" }), false);
  });
});
