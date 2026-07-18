import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SANDBOX_ACCOUNTS, buildSandboxTransactions } from "../banking/sandbox-data";
import { generateAdvice } from "./advice";
import { buildFinancialProfile, computeWellnessScore } from "./analytics";

describe("financial wellness engine", () => {
  const profile = buildFinancialProfile(
    SANDBOX_ACCOUNTS,
    buildSandboxTransactions(),
  );

  it("builds a coherent profile from sandbox banking data", () => {
    assert.ok(profile.monthly.income > 3000);
    assert.ok(profile.liquidAssets > 0);
    assert.ok(profile.creditCardDebt > 0);
    assert.ok(profile.subscriptions.length >= 3);
    assert.ok(profile.emergencyFundMonths > 0);
  });

  it("scores wellness in a sensible range", () => {
    const { score, label } = computeWellnessScore(profile);
    assert.ok(score >= 15 && score <= 98);
    assert.ok(label.length > 0);
  });

  it("returns prioritized tailored advice", () => {
    const report = generateAdvice(profile);
    assert.ok(report.advice.length >= 3);
    assert.ok(report.headline.length > 0);
    assert.ok(report.circumstances.includes("Income"));
    const priorities = report.advice.map((a) => a.priority);
    const firstHigh = priorities.indexOf("high");
    const firstLow = priorities.indexOf("low");
    if (firstHigh !== -1 && firstLow !== -1) {
      assert.ok(firstHigh < firstLow);
    }
  });
});
