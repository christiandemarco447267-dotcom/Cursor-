import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cloudDocumentsFor,
  deleteConfirmationMatches,
  isSentiaKey,
  wipeLocalData,
  wipeStorage,
  type KeyValueStorage,
} from "./data-deletion";
import { STORAGE_KEY, UNREADABLE_BACKUP_KEY } from "./storage";
import { CONSENT_KEY } from "./analytics";
import { FIRST_SEEN_KEY, SURVEY_KEY } from "./survey";

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  constructor(entries: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(entries)) this.map.set(k, v);
  }
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe("data deletion", () => {
  it("recognises every key Sentia writes, and nothing else", () => {
    for (const key of [STORAGE_KEY, UNREADABLE_BACKUP_KEY, CONSENT_KEY, FIRST_SEEN_KEY, SURVEY_KEY, "sentia.guest", "sentia.emailForSignIn", "sentia.reauthNotice", "trellis.state.v2", "ainvestpro.state.v2"]) {
      assert.equal(isSentiaKey(key), true, key);
    }
    for (const key of ["", null, undefined, "other-app", "sentiaX", "firebase:authUser:abc"]) {
      assert.equal(isSentiaKey(key), false, String(key));
    }
  });

  it("wipes only Sentia keys (and Firebase session keys when asked)", () => {
    const storage = new MemoryStorage({
      [STORAGE_KEY]: "{}",
      [CONSENT_KEY]: "granted",
      "trellis.state.v2": "{}",
      "firebase:authUser:key:[DEFAULT]": "{}",
      "someone-else": "keep",
    });
    const removed = wipeStorage(storage);
    assert.deepEqual(removed.sort(), [CONSENT_KEY, STORAGE_KEY, "trellis.state.v2"].sort());
    assert.deepEqual([...storage.map.keys()].sort(), ["firebase:authUser:key:[DEFAULT]", "someone-else"]);
    assert.deepEqual(wipeStorage(storage, { includeFirebase: true }), ["firebase:authUser:key:[DEFAULT]"]);
    assert.deepEqual([...storage.map.keys()], ["someone-else"]);
  });

  it("never throws when storage is missing or broken", () => {
    assert.deepEqual(wipeStorage(null), []);
    const broken: KeyValueStorage = {
      get length(): number {
        throw new Error("SecurityError");
      },
      key: () => null,
      removeItem: () => undefined,
    };
    assert.deepEqual(wipeStorage(broken), []);
    const stubborn = new MemoryStorage({ [STORAGE_KEY]: "{}", [SURVEY_KEY]: "x" });
    stubborn.removeItem = (k: string) => {
      if (k === STORAGE_KEY) throw new Error("nope");
      stubborn.map.delete(k);
    };
    assert.deepEqual(wipeStorage(stubborn), [SURVEY_KEY]);
  });

  it("wipes local + session storage and Sentia's offline caches", async () => {
    const local = new MemoryStorage({ [STORAGE_KEY]: "{}", "firebase:authUser:x": "{}", keep: "1" });
    const session = new MemoryStorage({ "sentia.reauthNotice": "1" });
    const names = ["sentia-shell-v1", "sentia-assets-v1", "other-cache"];
    const caches = {
      keys: async () => [...names],
      delete: async (name: string) => {
        const i = names.indexOf(name);
        if (i < 0) return false;
        names.splice(i, 1);
        return true;
      },
    };
    const result = await wipeLocalData({ local, session, caches });
    assert.deepEqual(result.localKeys.sort(), ["firebase:authUser:x", STORAGE_KEY].sort());
    assert.deepEqual(result.sessionKeys, ["sentia.reauthNotice"]);
    assert.deepEqual(result.caches.sort(), ["sentia-assets-v1", "sentia-shell-v1"]);
    assert.deepEqual(names, ["other-cache"]);
    assert.deepEqual([...local.map.keys()], ["keep"]);
    // A failing Cache Storage doesn't stop the wipe.
    const failing = { keys: async () => Promise.reject(new Error("no caches")), delete: async () => false };
    const again = await wipeLocalData({ local: new MemoryStorage({ [STORAGE_KEY]: "1" }), caches: failing });
    assert.deepEqual(again.localKeys, [STORAGE_KEY]);
    assert.deepEqual(again.caches, []);
  });

  it("requires typing DELETE to confirm", () => {
    assert.equal(deleteConfirmationMatches("DELETE"), true);
    assert.equal(deleteConfirmationMatches(" delete "), true);
    assert.equal(deleteConfirmationMatches("delet"), false);
    assert.equal(deleteConfirmationMatches(""), false);
  });

  it("lists the user's cloud documents: paper account + each league membership", () => {
    assert.deepEqual(cloudDocumentsFor("u1", ["ABC234", "XYZ789"]), [
      ["users", "u1", "state", "current"],
      ["leagues", "ABC234", "members", "u1"],
      ["leagues", "XYZ789", "members", "u1"],
    ]);
    assert.deepEqual(cloudDocumentsFor("", ["ABC234"]), []);
  });
});
