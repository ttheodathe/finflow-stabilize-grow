export class InventoryServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InventoryServiceError";
    this.code = code;
  }
}
