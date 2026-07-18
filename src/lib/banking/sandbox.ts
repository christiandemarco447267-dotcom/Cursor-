import { buildSandboxTransactions, SANDBOX_ACCOUNTS } from "./sandbox-data";
import type {
  BankingProvider,
  BankingSnapshot,
  InstitutionConnection,
} from "./types";

const SANDBOX_ITEM_ID = "item_sandbox_harbor_demo";

export class SandboxBankingProvider implements BankingProvider {
  async createLinkToken(userId: string): Promise<{ linkToken: string }> {
    return {
      linkToken: `link-sandbox-${userId}-${Date.now()}`,
    };
  }

  async exchangePublicToken(
    publicToken: string,
  ): Promise<InstitutionConnection> {
    if (!publicToken.startsWith("public-sandbox") && publicToken !== "sandbox-demo") {
      // Still accept demo tokens for the connect UI flow.
    }

    return {
      itemId: SANDBOX_ITEM_ID,
      institutionId: "ins_sandbox_harbor",
      institutionName: "Harbor Federal Credit Union",
      connectedAt: new Date().toISOString(),
    };
  }

  async getSnapshot(itemId: string): Promise<BankingSnapshot> {
    if (itemId !== SANDBOX_ITEM_ID && itemId !== "sandbox") {
      throw new Error("Unknown sandbox item");
    }

    return {
      connection: {
        itemId: SANDBOX_ITEM_ID,
        institutionId: "ins_sandbox_harbor",
        institutionName: "Harbor Federal Credit Union",
        connectedAt: new Date().toISOString(),
      },
      accounts: SANDBOX_ACCOUNTS,
      transactions: buildSandboxTransactions(),
    };
  }
}

export const SANDBOX_ITEM_ID_VALUE = SANDBOX_ITEM_ID;
