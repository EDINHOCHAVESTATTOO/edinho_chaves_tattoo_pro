/** Validate Brazilian CPF/CNPJ check digits before creating a fiscal draft.
 * This checks formatting and arithmetic only; it does not confirm taxpayer registration.
 */
export function isValidTaxId(input: string): boolean {
  const value = input.replace(/\D/g, '');
  if (!/^(\d{11}|\d{14})$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const digits = Array.from(value, Number);
  if (digits.length === 11) {
    const check = (length: number): number => {
      const sum = digits.slice(0, length).reduce((acc, digit, i) => acc + digit * (length + 1 - i), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return check(9) === digits[9] && check(10) === digits[10];
  }
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const check = (length: number): number => {
    const sum = digits.slice(0, length).reduce((acc, digit, i) => acc + digit * weights.slice(13 - length)[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return check(12) === digits[12] && check(13) === digits[13];
}
