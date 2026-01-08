import { NextResponse } from 'next/server';

/**
 * Custom API error with status code and context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Check if an error is expected (e.g., file not found)
 */
export function isExpectedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const nodeError = error as NodeJS.ErrnoException;
  return nodeError.code === 'ENOENT' || nodeError.code === 'ENOTDIR';
}

/**
 * Log an API error with context
 */
export function logApiError(
  route: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[API Error] ${route}:`, {
    error: errorMessage,
    stack,
    context,
  });
}

interface ErrorHandlerOptions {
  defaultMessage?: string;
  context?: Record<string, unknown>;
  fallbackResponse?: unknown;
}

/**
 * Create an error handler for API routes
 */
export function createApiErrorHandler(
  route: string,
  options: ErrorHandlerOptions = {}
) {
  const {
    defaultMessage = 'Internal server error',
    context,
    fallbackResponse,
  } = options;

  return (error: unknown): NextResponse => {
    // Handle expected errors silently
    if (isExpectedError(error)) {
      if (fallbackResponse !== undefined) {
        return NextResponse.json(fallbackResponse);
      }
      return NextResponse.json({ error: defaultMessage }, { status: 500 });
    }

    // Log unexpected errors
    logApiError(route, error, context);

    // Handle ApiError with custom status
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    // Default 500 response
    return NextResponse.json({ error: defaultMessage }, { status: 500 });
  };
}
