export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "ERROR",
  ) {
    super(message);
  }
}
