export const FREE_SIGNUP_CREDITS = 5;
export const BOOK_CREATION_COST = 10;

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceInCents: number;
  variantId: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "package_10",
    name: "Starter Pack",
    credits: 10,
    priceInCents: 1000,
    variantId: "",
  },
  {
    id: "package_50",
    name: "Popular Pack",
    credits: 50,
    priceInCents: 4000,
    variantId: "",
  },
  {
    id: "package_100",
    name: "Pro Pack",
    credits: 100,
    priceInCents: 7000,
    variantId: "",
  },
];

export function getCreditPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);
}

export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

export function getPricePerCredit(
  priceInCents: number,
  credits: number,
): string {
  return `$${(priceInCents / 100 / credits).toFixed(2)}`;
}
