import type { BankAccount, Transaction } from "./types";

/** Realistic demo profile used when no live banking credentials are configured. */
export const SANDBOX_ACCOUNTS: BankAccount[] = [
  {
    id: "acc_checking",
    name: "Everyday Checking",
    officialName: "Harbor Federal Everyday Checking",
    type: "depository",
    subtype: "checking",
    mask: "4821",
    institution: "Harbor Federal Credit Union",
    currentBalance: 3240.55,
    availableBalance: 3012.1,
    currency: "USD",
  },
  {
    id: "acc_savings",
    name: "High-Yield Savings",
    officialName: "Harbor Federal High-Yield Savings",
    type: "depository",
    subtype: "savings",
    mask: "1190",
    institution: "Harbor Federal Credit Union",
    currentBalance: 4850.0,
    availableBalance: 4850.0,
    currency: "USD",
  },
  {
    id: "acc_credit",
    name: "Rewards Visa",
    officialName: "Harbor Rewards Visa Signature",
    type: "credit",
    subtype: "credit card",
    mask: "7734",
    institution: "Harbor Federal Credit Union",
    currentBalance: 2145.67,
    availableBalance: 7854.33,
    currency: "USD",
    apr: 22.9,
  },
  {
    id: "acc_student",
    name: "Student Loan",
    officialName: "Federal Direct Consolidated Loan",
    type: "loan",
    subtype: "student",
    mask: "3302",
    institution: "Dept of Education / Mohela",
    currentBalance: 18640.0,
    availableBalance: null,
    currency: "USD",
    apr: 5.5,
  },
];

type SeedTxn = Omit<Transaction, "id">;

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** ~90 days of cash-flow activity for advice generation. */
const SEED: SeedTxn[] = [
  // Income
  { accountId: "acc_checking", date: daysAgo(2), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4200, category: ["Transfer", "Payroll"], pending: false },
  { accountId: "acc_checking", date: daysAgo(16), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4200, category: ["Transfer", "Payroll"], pending: false },
  { accountId: "acc_checking", date: daysAgo(30), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4200, category: ["Transfer", "Payroll"], pending: false },
  { accountId: "acc_checking", date: daysAgo(44), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4200, category: ["Transfer", "Payroll"], pending: false },
  { accountId: "acc_checking", date: daysAgo(58), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4200, category: ["Transfer", "Payroll"], pending: false },
  { accountId: "acc_checking", date: daysAgo(72), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4200, category: ["Transfer", "Payroll"], pending: false },
  { accountId: "acc_checking", date: daysAgo(86), name: "ACME CORP PAYROLL", merchantName: "Acme Corp", amount: -4100, category: ["Transfer", "Payroll"], pending: false },

  // Housing
  { accountId: "acc_checking", date: daysAgo(3), name: "LANDLORD LLC RENT", merchantName: "Landlord LLC", amount: 1850, category: ["Payment", "Rent"], pending: false },
  { accountId: "acc_checking", date: daysAgo(33), name: "LANDLORD LLC RENT", merchantName: "Landlord LLC", amount: 1850, category: ["Payment", "Rent"], pending: false },
  { accountId: "acc_checking", date: daysAgo(63), name: "LANDLORD LLC RENT", merchantName: "Landlord LLC", amount: 1850, category: ["Payment", "Rent"], pending: false },

  // Utilities & telecom
  { accountId: "acc_checking", date: daysAgo(5), name: "CITY POWER & LIGHT", merchantName: "City Power", amount: 124.5, category: ["Service", "Utilities"], pending: false },
  { accountId: "acc_checking", date: daysAgo(35), name: "CITY POWER & LIGHT", merchantName: "City Power", amount: 118.2, category: ["Service", "Utilities"], pending: false },
  { accountId: "acc_checking", date: daysAgo(65), name: "CITY POWER & LIGHT", merchantName: "City Power", amount: 132.8, category: ["Service", "Utilities"], pending: false },
  { accountId: "acc_credit", date: daysAgo(8), name: "VERIZON WIRELESS", merchantName: "Verizon", amount: 89.0, category: ["Service", "Telecommunication Services"], pending: false },
  { accountId: "acc_credit", date: daysAgo(38), name: "VERIZON WIRELESS", merchantName: "Verizon", amount: 89.0, category: ["Service", "Telecommunication Services"], pending: false },
  { accountId: "acc_credit", date: daysAgo(68), name: "VERIZON WIRELESS", merchantName: "Verizon", amount: 89.0, category: ["Service", "Telecommunication Services"], pending: false },

  // Subscriptions
  { accountId: "acc_credit", date: daysAgo(1), name: "NETFLIX.COM", merchantName: "Netflix", amount: 15.49, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(4), name: "SPOTIFY USA", merchantName: "Spotify", amount: 11.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(6), name: "ADOBE CREATIVE CLOUD", merchantName: "Adobe", amount: 59.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(7), name: "PELOTON MEMBERSHIP", merchantName: "Peloton", amount: 44.0, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(9), name: "ICLOUD STORAGE", merchantName: "Apple", amount: 2.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(11), name: "NYT DIGITAL", merchantName: "New York Times", amount: 17.0, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(31), name: "NETFLIX.COM", merchantName: "Netflix", amount: 15.49, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(34), name: "SPOTIFY USA", merchantName: "Spotify", amount: 11.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(36), name: "ADOBE CREATIVE CLOUD", merchantName: "Adobe", amount: 59.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(37), name: "PELOTON MEMBERSHIP", merchantName: "Peloton", amount: 44.0, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(39), name: "ICLOUD STORAGE", merchantName: "Apple", amount: 2.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(41), name: "NYT DIGITAL", merchantName: "New York Times", amount: 17.0, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(61), name: "NETFLIX.COM", merchantName: "Netflix", amount: 15.49, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(64), name: "SPOTIFY USA", merchantName: "Spotify", amount: 11.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(66), name: "ADOBE CREATIVE CLOUD", merchantName: "Adobe", amount: 59.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(67), name: "PELOTON MEMBERSHIP", merchantName: "Peloton", amount: 44.0, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(69), name: "ICLOUD STORAGE", merchantName: "Apple", amount: 2.99, category: ["Service", "Subscription"], pending: false },
  { accountId: "acc_credit", date: daysAgo(71), name: "NYT DIGITAL", merchantName: "New York Times", amount: 17.0, category: ["Service", "Subscription"], pending: false },

  // Groceries & dining
  { accountId: "acc_credit", date: daysAgo(1), name: "WHOLE FOODS #102", merchantName: "Whole Foods", amount: 86.42, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(3), name: "TRADER JOE'S #418", merchantName: "Trader Joe's", amount: 54.18, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(5), name: "SWEETGREEN", merchantName: "Sweetgreen", amount: 16.75, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(6), name: "CHIPOTLE 1882", merchantName: "Chipotle", amount: 13.4, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(8), name: "UBER EATS", merchantName: "Uber Eats", amount: 42.9, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(10), name: "STARBUCKS", merchantName: "Starbucks", amount: 6.45, category: ["Food and Drink", "Coffee Shop"], pending: false },
  { accountId: "acc_credit", date: daysAgo(12), name: "WHOLE FOODS #102", merchantName: "Whole Foods", amount: 112.3, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(14), name: "DOORDASH", merchantName: "DoorDash", amount: 38.2, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(17), name: "TRADER JOE'S #418", merchantName: "Trader Joe's", amount: 67.9, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(19), name: "STARBUCKS", merchantName: "Starbucks", amount: 5.95, category: ["Food and Drink", "Coffee Shop"], pending: false },
  { accountId: "acc_credit", date: daysAgo(21), name: "SWEETGREEN", merchantName: "Sweetgreen", amount: 18.1, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(24), name: "UBER EATS", merchantName: "Uber Eats", amount: 51.6, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(27), name: "WHOLE FOODS #102", merchantName: "Whole Foods", amount: 94.05, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(32), name: "CHIPOTLE 1882", merchantName: "Chipotle", amount: 14.2, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(40), name: "DOORDASH", merchantName: "DoorDash", amount: 44.8, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(48), name: "WHOLE FOODS #102", merchantName: "Whole Foods", amount: 78.6, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(55), name: "UBER EATS", merchantName: "Uber Eats", amount: 36.4, category: ["Food and Drink", "Restaurants"], pending: false },
  { accountId: "acc_credit", date: daysAgo(62), name: "TRADER JOE'S #418", merchantName: "Trader Joe's", amount: 61.25, category: ["Shops", "Food and Drink", "Groceries"], pending: false },
  { accountId: "acc_credit", date: daysAgo(70), name: "STARBUCKS", merchantName: "Starbucks", amount: 7.15, category: ["Food and Drink", "Coffee Shop"], pending: false },
  { accountId: "acc_credit", date: daysAgo(78), name: "WHOLE FOODS #102", merchantName: "Whole Foods", amount: 103.4, category: ["Shops", "Food and Drink", "Groceries"], pending: false },

  // Transport
  { accountId: "acc_credit", date: daysAgo(2), name: "SHELL OIL 5748291", merchantName: "Shell", amount: 48.2, category: ["Travel", "Gas Stations"], pending: false },
  { accountId: "acc_credit", date: daysAgo(15), name: "SHELL OIL 5748291", merchantName: "Shell", amount: 52.1, category: ["Travel", "Gas Stations"], pending: false },
  { accountId: "acc_credit", date: daysAgo(28), name: "SHELL OIL 5748291", merchantName: "Shell", amount: 45.9, category: ["Travel", "Gas Stations"], pending: false },
  { accountId: "acc_credit", date: daysAgo(45), name: "SHELL OIL 5748291", merchantName: "Shell", amount: 51.3, category: ["Travel", "Gas Stations"], pending: false },
  { accountId: "acc_credit", date: daysAgo(9), name: "UBER TRIP", merchantName: "Uber", amount: 22.4, category: ["Travel", "Taxi"], pending: false },
  { accountId: "acc_credit", date: daysAgo(22), name: "UBER TRIP", merchantName: "Uber", amount: 18.75, category: ["Travel", "Taxi"], pending: false },

  // Shopping / lifestyle
  { accountId: "acc_credit", date: daysAgo(13), name: "AMAZON.COM", merchantName: "Amazon", amount: 67.84, category: ["Shops", "Digital Purchase"], pending: false },
  { accountId: "acc_credit", date: daysAgo(25), name: "TARGET T-2145", merchantName: "Target", amount: 89.32, category: ["Shops", "Department Stores"], pending: false },
  { accountId: "acc_credit", date: daysAgo(43), name: "AMAZON.COM", merchantName: "Amazon", amount: 124.5, category: ["Shops", "Digital Purchase"], pending: false },
  { accountId: "acc_credit", date: daysAgo(52), name: "NORDSTROM", merchantName: "Nordstrom", amount: 156.0, category: ["Shops", "Clothing and Accessories"], pending: false },
  { accountId: "acc_credit", date: daysAgo(74), name: "AMAZON.COM", merchantName: "Amazon", amount: 42.18, category: ["Shops", "Digital Purchase"], pending: false },

  // Debt & savings transfers
  { accountId: "acc_checking", date: daysAgo(4), name: "CREDIT CARD PAYMENT", merchantName: "Harbor Rewards Visa", amount: 500, category: ["Payment", "Credit Card"], pending: false },
  { accountId: "acc_checking", date: daysAgo(34), name: "CREDIT CARD PAYMENT", merchantName: "Harbor Rewards Visa", amount: 450, category: ["Payment", "Credit Card"], pending: false },
  { accountId: "acc_checking", date: daysAgo(64), name: "CREDIT CARD PAYMENT", merchantName: "Harbor Rewards Visa", amount: 400, category: ["Payment", "Credit Card"], pending: false },
  { accountId: "acc_checking", date: daysAgo(7), name: "STUDENT LOAN PMT", merchantName: "Mohela", amount: 285, category: ["Payment", "Loan"], pending: false },
  { accountId: "acc_checking", date: daysAgo(37), name: "STUDENT LOAN PMT", merchantName: "Mohela", amount: 285, category: ["Payment", "Loan"], pending: false },
  { accountId: "acc_checking", date: daysAgo(67), name: "STUDENT LOAN PMT", merchantName: "Mohela", amount: 285, category: ["Payment", "Loan"], pending: false },
  { accountId: "acc_checking", date: daysAgo(10), name: "TRANSFER TO SAVINGS", merchantName: null, amount: 300, category: ["Transfer", "Savings"], pending: false },
  { accountId: "acc_savings", date: daysAgo(10), name: "TRANSFER FROM CHECKING", merchantName: null, amount: -300, category: ["Transfer", "Deposit"], pending: false },
  { accountId: "acc_checking", date: daysAgo(40), name: "TRANSFER TO SAVINGS", merchantName: null, amount: 200, category: ["Transfer", "Savings"], pending: false },
  { accountId: "acc_savings", date: daysAgo(40), name: "TRANSFER FROM CHECKING", merchantName: null, amount: -200, category: ["Transfer", "Deposit"], pending: false },
  { accountId: "acc_checking", date: daysAgo(70), name: "TRANSFER TO SAVINGS", merchantName: null, amount: 250, category: ["Transfer", "Savings"], pending: false },
  { accountId: "acc_savings", date: daysAgo(70), name: "TRANSFER FROM CHECKING", merchantName: null, amount: -250, category: ["Transfer", "Deposit"], pending: false },

  // Health / misc
  { accountId: "acc_credit", date: daysAgo(18), name: "CVS PHARMACY", merchantName: "CVS", amount: 28.4, category: ["Shops", "Pharmacies"], pending: false },
  { accountId: "acc_checking", date: daysAgo(20), name: "HEALTH INSURANCE", merchantName: "Bright Health", amount: 210, category: ["Service", "Insurance"], pending: false },
  { accountId: "acc_checking", date: daysAgo(50), name: "HEALTH INSURANCE", merchantName: "Bright Health", amount: 210, category: ["Service", "Insurance"], pending: false },
  { accountId: "acc_checking", date: daysAgo(80), name: "HEALTH INSURANCE", merchantName: "Bright Health", amount: 210, category: ["Service", "Insurance"], pending: false },
];

export function buildSandboxTransactions(): Transaction[] {
  return SEED.map((txn, index) => ({
    ...txn,
    id: `txn_${String(index + 1).padStart(4, "0")}`,
  }));
}
