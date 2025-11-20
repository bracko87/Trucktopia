/**
 * Logout page component
 * Handles user logout and redirects to home page
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useGame } from '../contexts/GameContext'

export default function Logout() {
  const navigate = useNavigate()
  const { logout } = useGame()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    // Prevent multiple logout calls
    if (isLoggingOut) return
    
    console.log('Logout component mounted - performing logout')
    setIsLoggingOut(true)
    
    // Perform logout
    logout()
    
    // Redirect to home page immediately
    navigate('/', { replace: true })
  }, []) // Empty dependency array to run only once on mount

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-white">Logging out...</h2>
        <p className="text-slate-400 mt-2">Please wait while we sign you out</p>
      </div>
    </div>
  )
}