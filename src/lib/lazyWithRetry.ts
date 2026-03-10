import { lazy, ComponentType } from 'react'

/**
 * Wraps React.lazy with automatic retry on chunk load failures.
 * Retries up to 3 times with exponential backoff before giving up.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
): ReturnType<typeof lazy> {
  return lazy(() => retryImport(factory, retries))
}

async function retryImport<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries: number,
): Promise<{ default: T }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await factory()
    } catch (error) {
      if (attempt === retries || !isChunkError(error)) {
        throw error
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
    }
  }
  // Unreachable, but satisfies TypeScript
  return factory()
}

function isChunkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('dynamically imported module') ||
      msg.includes('failed to fetch') ||
      msg.includes('importing a module script failed')
    )
  }
  return false
}
