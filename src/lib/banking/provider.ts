import { PlaidBankingProvider } from "./plaid";
import { SandboxBankingProvider } from "./sandbox";
import type { BankingProvider } from "./types";

export function isLivePlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function getBankingProvider(): BankingProvider {
  if (isLivePlaidConfigured()) {
    return new PlaidBankingProvider();
  }
  return new SandboxBankingProvider();
}

export function getBankingMode(): "sandbox" | "plaid" {
  return isLivePlaidConfigured() ? "plaid" : "sandbox";
}
