import type { ValidatorEntry } from "../types.js";

export class ValidatorStore {
  private validators = new Map<string, ValidatorEntry>();

  set(pubkey: string, entry: ValidatorEntry): void {
    this.validators.set(pubkey.toLowerCase(), entry);
  }

  get(pubkey: string): ValidatorEntry | undefined {
    return this.validators.get(pubkey.toLowerCase());
  }

  delete(pubkey: string): boolean {
    return this.validators.delete(pubkey.toLowerCase());
  }

  list(): Array<{ pubkey: string; entry: ValidatorEntry }> {
    return Array.from(this.validators.entries()).map(([pubkey, entry]) => ({
      pubkey,
      entry,
    }));
  }

  clear(): void {
    this.validators.clear();
  }

  get size(): number {
    return this.validators.size;
  }
}

export const store = new ValidatorStore();
