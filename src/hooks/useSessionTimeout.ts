import { useEffect, useRef, useCallback } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'

const SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes of inactivity
const WARNING_BEFORE_MS = 60 * 1000 // Show warning 1 minute before timeout

interface UseSessionTimeoutOptions {
  onWarning?: () => void
  onTimeout?: () => void
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const { signOut } = useAuthActions()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
      warningRef.current = null
    }
  }, [])

  const handleTimeout = useCallback(async () => {
    options.onTimeout?.()
    await signOut()
  }, [signOut, options])

  const handleWarning = useCallback(() => {
    options.onWarning?.()
  }, [options])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    clearTimers()

    warningRef.current = setTimeout(() => {
      handleWarning()
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS)

    timeoutRef.current = setTimeout(() => {
      handleTimeout()
    }, SESSION_TIMEOUT_MS)
  }, [clearTimers, handleWarning, handleTimeout])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearTimers()
    }
  }, [resetTimer, clearTimers])

  return {
    resetTimer,
    getRemainingTime: () => {
      const elapsed = Date.now() - lastActivityRef.current
      return Math.max(0, SESSION_TIMEOUT_MS - elapsed)
    }
  }
}
