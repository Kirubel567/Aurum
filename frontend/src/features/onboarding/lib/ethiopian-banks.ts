export interface EthiopianBankAccount {
  id: string;
  label: string;
  accountHolder: string;
  accountNumber: string;
}

export const ETHIOPIAN_BANK_ACCOUNTS: EthiopianBankAccount[] = [
  {
    id: "cbe",
    label: "Commercial Bank of Ethiopia (CBE)",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "1000-8842-1093-7741",
  },
  {
    id: "telebirr",
    label: "Telebirr",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "0911-22-33-44",
  },
  {
    id: "cbe-birr",
    label: "CBE Birr",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "0911-22-33-44",
  },
  {
    id: "bank-of-abyssinia",
    label: "Bank of Abyssinia",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "8842-1093-7741-99",
  },
  {
    id: "awash",
    label: "Awash International Bank",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "0132-0987-1234-00",
  },
  {
    id: "zemen",
    label: "Zemen Bank",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "7741-1093-8842",
  },
  {
    id: "dashen",
    label: "Dashen Bank",
    accountHolder: "Aurum Sovereign Capital Ltd.",
    accountNumber: "5241-8842-1093-00",
  },
];

export const DEFAULT_ETHIOPIAN_BANK_ID = ETHIOPIAN_BANK_ACCOUNTS[0].id;

export function getEthiopianBankById(
  id: string
): EthiopianBankAccount | undefined {
  return ETHIOPIAN_BANK_ACCOUNTS.find((bank) => bank.id === id);
}
