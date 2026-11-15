/** Validation or business-rule error mapped to an HTTP client error status in `/api/checkout`. */
export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}
