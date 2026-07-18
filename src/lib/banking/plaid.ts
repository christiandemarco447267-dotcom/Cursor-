import type {
  BankingProvider,
  BankingSnapshot,
  InstitutionConnection,
} from "./types";

/**
 * Live Plaid provider.
 *
 * Configure with:
 *   PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV (sandbox|development|production)
 *
 * This class talks to Plaid's REST API without requiring the SDK package,
 * so the app stays runnable in demo mode when credentials are absent.
 */
export class PlaidBankingProvider implements BankingProvider {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly secret: string;

  constructor() {
    const env = process.env.PLAID_ENV ?? "sandbox";
    this.baseUrl =
      env === "production"
        ? "https://production.plaid.com"
        : env === "development"
          ? "https://development.plaid.com"
          : "https://sandbox.plaid.com";
    this.clientId = process.env.PLAID_CLIENT_ID ?? "";
    this.secret = process.env.PLAID_SECRET ?? "";

    if (!this.clientId || !this.secret) {
      throw new Error("PLAID_CLIENT_ID and PLAID_SECRET are required for live mode");
    }
  }

  private async plaidFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        secret: this.secret,
        ...body,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Plaid ${path} failed (${res.status}): ${detail}`);
    }

    return res.json() as Promise<T>;
  }

  async createLinkToken(userId: string): Promise<{ linkToken: string }> {
    const data = await this.plaidFetch<{ link_token: string }>("/link/token/create", {
      user: { client_user_id: userId },
      client_name: "Harbor",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    return { linkToken: data.link_token };
  }

  async exchangePublicToken(publicToken: string): Promise<InstitutionConnection> {
    const exchange = await this.plaidFetch<{
      access_token: string;
      item_id: string;
    }>("/item/public_token/exchange", { public_token: publicToken });

    const item = await this.plaidFetch<{
      item: { institution_id: string | null };
    }>("/item/get", { access_token: exchange.access_token });

    let institutionName = "Connected bank";
    if (item.item.institution_id) {
      const inst = await this.plaidFetch<{
        institution: { name: string };
      }>("/institutions/get_by_id", {
        institution_id: item.item.institution_id,
        country_codes: ["US"],
      });
      institutionName = inst.institution.name;
    }

    // Persist access_token in your store for production. Demo keeps it in cookie via API.
    return {
      itemId: exchange.item_id,
      institutionId: item.item.institution_id ?? "unknown",
      institutionName,
      connectedAt: new Date().toISOString(),
    };
  }

  async getSnapshot(itemId: string): Promise<BankingSnapshot> {
    // Production apps look up the stored access_token for itemId.
    const accessToken = process.env.PLAID_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error(
        `No stored access token for item ${itemId}. Set PLAID_ACCESS_TOKEN or persist tokens after exchange.`,
      );
    }

    const accountsRes = await this.plaidFetch<{
      accounts: Array<{
        account_id: string;
        name: string;
        official_name: string | null;
        type: string;
        subtype: string | null;
        mask: string | null;
        balances: { current: number | null; available: number | null; iso_currency_code: string | null };
      }>;
      item: { institution_id: string | null };
    }>("/accounts/get", { access_token: accessToken });

    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - 90);

    const txnsRes = await this.plaidFetch<{
      transactions: Array<{
        transaction_id: string;
        account_id: string;
        date: string;
        name: string;
        merchant_name: string | null;
        amount: number;
        category: string[] | null;
        pending: boolean;
      }>;
    }>("/transactions/get", {
      access_token: accessToken,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    });

    return {
      connection: {
        itemId,
        institutionId: accountsRes.item.institution_id ?? "unknown",
        institutionName: "Connected institution",
        connectedAt: new Date().toISOString(),
      },
      accounts: accountsRes.accounts.map((a) => ({
        id: a.account_id,
        name: a.name,
        officialName: a.official_name ?? a.name,
        type: a.type as BankingSnapshot["accounts"][number]["type"],
        subtype: (a.subtype ?? "checking") as BankingSnapshot["accounts"][number]["subtype"],
        mask: a.mask ?? "0000",
        institution: "Connected institution",
        currentBalance: a.balances.current ?? 0,
        availableBalance: a.balances.available,
        currency: a.balances.iso_currency_code ?? "USD",
      })),
      transactions: txnsRes.transactions.map((t) => ({
        id: t.transaction_id,
        accountId: t.account_id,
        date: t.date,
        name: t.name,
        merchantName: t.merchant_name,
        amount: t.amount,
        category: t.category ?? ["Other"],
        pending: t.pending,
      })),
    };
  }
}
