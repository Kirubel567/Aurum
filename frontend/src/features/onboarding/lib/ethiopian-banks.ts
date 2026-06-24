export interface EthiopianBankAccount {
  id: string;
  label: string;
  accountHolder: string;
  accountNumber: string;
  badge?: string;
}

export const ETHIOPIAN_BANK_ACCOUNTS: EthiopianBankAccount[] = [
  {
    id: "cbe",
    label: "Commercial Bank of Ethiopia (CBE)",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1000549712502",
    badge: "Recommended",
  },
  {
    id: "boa",
    label: "Bank of Abyssinia (BOA)",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "162435388",
  },
  {
    id: "telebirr",
    label: "Telebirr",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "0901090348",
  },
  {
    id: "awash",
    label: "Awash Bank",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "01320151831901",
  },
  {
    id: "coop",
    label: "Cooperative Bank of Oromia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1026100366733",
  },
];

export const DEFAULT_ETHIOPIAN_BANK_ID = ETHIOPIAN_BANK_ACCOUNTS[0].id;

export function getEthiopianBankById(
  id: string
): EthiopianBankAccount | undefined {
  return ETHIOPIAN_BANK_ACCOUNTS.find((bank) => bank.id === id);
}
