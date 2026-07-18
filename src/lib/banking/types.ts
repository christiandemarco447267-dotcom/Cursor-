export type AccountType = "depository" | "credit" | "loan" | "investment";
export type AccountSubtype =
  | "checking"
  | "savings"
  | "credit card"
  | "student"
  | "mortgage"
  | "brokerage";

export interface BankAccount {
  id: string;
  name: string;
  officialName: string;
  type: AccountType;
  subtype: AccountSubtype;
  mask: string;
  institution: string;
  currentBalance: number;
  availableBalance: number | null;
  currency: string;
  /** APR for credit/loan accounts when known */
  apr?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  /** Positive = money out; negative = money in (Plaid convention) */
  category: string[];
  pending: boolean;
}

export interface InstitutionConnection {
  itemId: string;
  institutionId: string;
  institutionName: string;
  connectedAt: string;
}

export interface BankingSnapshot {
  connection: InstitutionConnection;
  accounts: BankAccount[];
  transactions: Transaction[];
}

export interface BankingProvider {
  createLinkToken(userId: string): Promise<{ linkToken: string }>;
  exchangePublicToken(publicToken: string): Promise<InstitutionConnection>;
  getSnapshot(itemId: string): Promise<BankingSnapshot>;
}
