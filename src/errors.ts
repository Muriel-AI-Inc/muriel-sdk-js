export class MurielAPIError extends Error {
  readonly statusCode?: number
  readonly response?: unknown

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message)
    this.name = 'MurielAPIError'
    this.statusCode = statusCode
    this.response = response
  }
}

export class MurielAuthenticationError extends MurielAPIError {
  constructor(message = 'Invalid API key', statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielAuthenticationError'
  }
}

export class MurielValidationError extends MurielAPIError {
  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielValidationError'
  }
}

export class MurielNotFoundError extends MurielAPIError {
  constructor(message = 'Resource not found', statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielNotFoundError'
  }
}

export class MurielRateLimitError extends MurielAPIError {
  constructor(message = 'Rate limit exceeded', statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielRateLimitError'
  }
}

export const BUY_CREDITS_EMAIL = 'info@murielai.io'
export const ACCOUNT_URL = 'https://murielai.io/account'

/**
 * HTTP 402: the account is out of Muriel API credits and needs more.
 *
 * Thrown before the call runs -- an agent question or a data call alike -- so
 * nothing was charged. The message always says so, plainly, and says how to
 * buy more; the server's own wording is kept in `serverMessage`.
 */
export class MurielCreditsError extends MurielAPIError {
  /** The account's credit balance, when the server reported it. */
  readonly balance?: number
  /** Where to buy more credits (an email link). */
  readonly buyUrl = `mailto:${BUY_CREDITS_EMAIL}?subject=Muriel%20credits`
  /** The account page, which shows the balance. */
  readonly accountUrl = ACCOUNT_URL
  /** The server's explanation, verbatim. */
  readonly serverMessage?: string

  constructor(serverMessage?: string, statusCode = 402, response?: unknown) {
    const detail = response && typeof response === 'object'
      ? (response as Record<string, unknown>).detail : undefined
    const balance = detail && typeof detail === 'object'
      && typeof (detail as Record<string, unknown>).balance === 'number'
      ? (detail as Record<string, number>).balance : undefined
    const bal = balance !== undefined ? ` (balance: ${balance})` : ''
    super(
      `Out of Muriel API credits${bal}. This call was not run and nothing was charged. ` +
      `To buy more credits, email ${BUY_CREDITS_EMAIL} or use 'Need more credits' on your ` +
      `account page (${ACCOUNT_URL}). Free accounts get 8 credits a month.`,
      statusCode, response)
    this.name = 'MurielCreditsError'
    this.balance = balance
    this.serverMessage = serverMessage
  }
}

export class MurielServerError extends MurielAPIError {
  constructor(message = 'Server error', statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielServerError'
  }
}
