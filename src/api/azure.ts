import axios from 'axios'
import Cookies from 'js-cookie'
import { reloadOnAuthExpired } from '../utils/authReload'
import createMockApi from './createMockApi'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

const realSsoApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let authToken: string | null = null

export const setAuthToken = (token: string | null) => {
  authToken = token
}

realSsoApi.interceptors.request.use(
  (config) => {
    const token = authToken || Cookies.get('token') || null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

realSsoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      reloadOnAuthExpired()
    }
    return Promise.reject(error)
  }
)

const ssoApi = useMock ? createMockApi() : realSsoApi

export default ssoApi
