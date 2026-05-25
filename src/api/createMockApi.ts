import { handleMockRequest } from './mockHandlers'

type MockConfig = {
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
  responseType?: string
}

const buildPath = (url: string, params?: Record<string, unknown>) => {
  const base = url.startsWith('/') ? url : `/${url}`
  if (!params || Object.keys(params).length === 0) return base
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.append(k, String(v))
  }
  const q = qs.toString()
  return q ? `${base}?${q}` : base
}

const createResponse = (data: unknown, status: number) => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config: {},
})

async function request(
  method: string,
  url: string,
  config?: MockConfig
) {
  const [pathOnly, queryString] = url.split('?')
  const path = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  const urlParams: Record<string, unknown> = {}
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => {
      urlParams[k] = v
    })
  }
  const mergedConfig = {
    ...config,
    params: { ...urlParams, ...config?.params },
  }
  const result = await handleMockRequest(method, path, mergedConfig)

  if (config?.responseType === 'blob' && result.data instanceof Blob) {
    return createResponse(result.data, result.status)
  }

  if (result.status >= 400) {
    const err = new Error('Mock API error') as Error & {
      response?: { data: unknown; status: number }
    }
    err.response = { data: result.data, status: result.status }
    throw err
  }

  return createResponse(result.data, result.status)
}

const createMockApi = () => ({
  defaults: { headers: { common: {} as Record<string, string> } },
  get: (url: string, config?: MockConfig) =>
    request('GET', buildPath(url, config?.params), config),
  post: (url: string, data?: unknown, config?: MockConfig) =>
    request('POST', url, { ...config, data }),
  put: (url: string, data?: unknown, config?: MockConfig) =>
    request('PUT', url, { ...config, data }),
  delete: (url: string, config?: MockConfig) =>
    request('DELETE', url, config),
  interceptors: {
    request: { use: () => undefined },
    response: { use: () => undefined },
  },
})

export default createMockApi
