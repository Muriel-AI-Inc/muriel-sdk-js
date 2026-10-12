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

/** HTTP 402: the key's account is out of credits. Raised before an agent question or a data call runs, so nothing was charged. */
export class MurielCreditsError extends MurielAPIError {
  constructor(message = 'Out of credits. Email info@murielai.io to add more.', statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielCreditsError'
  }
}

export class MurielServerError extends MurielAPIError {
  constructor(message = 'Server error', statusCode?: number, response?: unknown) {
    super(message, statusCode, response)
    this.name = 'MurielServerError'
  }
}
