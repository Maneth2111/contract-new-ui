export const mockDelay = (ms = 200) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))
