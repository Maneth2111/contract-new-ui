import Cookies from 'js-cookie'

let isReloading = false

export function reloadOnAuthExpired () {
  if (isReloading) return
  isReloading = true

  Cookies.remove('token')

  // Force a full reload 
  window.location.reload()
}

