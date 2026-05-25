import axios from 'axios'
import Cookies from 'js-cookie'
import { reloadOnAuthExpired } from '../utils/authReload'
import createMockApi from './createMockApi'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

const realApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

realApi.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

realApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      reloadOnAuthExpired()
    }
    return Promise.reject(error)
  }
)

const api = useMock ? createMockApi() : realApi

export default api
