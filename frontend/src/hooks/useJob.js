import { useState, useEffect, useRef } from 'react'
import { getStatus } from '../api'

export function useJob(jobId) {
  const [job, setJob] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!jobId) return
    let active = true

    const poll = async () => {
      try {
        const data = await getStatus(jobId)
        if (active) {
          setJob(data)
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(intervalRef.current)
          }
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)

    return () => {
      active = false
      clearInterval(intervalRef.current)
    }
  }, [jobId])

  return job
}
