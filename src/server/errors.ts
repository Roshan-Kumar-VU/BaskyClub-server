// Every expected failure is an AppError: the API turns it into a JSON reply
// { error: { code, message } } with the right HTTP status.
// The app and website show `message` and can branch on `code`.

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

/** Not logged in, or the login token is invalid / expired. */
export const unauthorized = (message = "Please log in to continue.") =>
  new AppError(401, "not_logged_in", message);

/** Logged in, but this person is not allowed to do this. */
export const forbidden = (code = "not_allowed", message = "You are not allowed to do this.") =>
  new AppError(403, code, message);

export const notFound = (what = "Item") => new AppError(404, "not_found", `${what} not found.`);

export const conflict = (code: string, message: string) => new AppError(409, code, message);
