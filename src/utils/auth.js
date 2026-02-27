// utils/auth.js
export const getToken = () => localStorage.getItem('app_token')

export const isTokenValid = () => {
  const token = getToken()
  if (!token) return false

  try {
    
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    return payload.exp > now // false si expiró
  } catch {
    return false
  }
}

export const logout = () => {
  localStorage.removeItem('app_token')
  window.location.href = '/login'
}