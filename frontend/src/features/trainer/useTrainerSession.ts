import { useCallback, useEffect, useRef, useState } from 'react'
import { saveTrainerSession } from '../../services/api'
import type {
  SaveTrainerSessionPayload,
  TrainerDifficulty,
  TrainerLanguage,
  TrainerMode,
  TrainerSession,
  TrainerTurn,
  VisualObservations,
} from '../../types/trainer'
import { LiveAudioPlayer, LiveAudioRecorder } from './audioStreaming'
import { VisualCuesCapture } from './visualCues'

export type TrainerSessionStatus =
  | 'idle'
  | 'requesting_permissions'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'ai_speaking'
  | 'reconnecting'
  | 'ending'
  | 'completed'
  | 'error'

export interface SessionConfig {
  mode: TrainerMode
  difficulty: TrainerDifficulty
  language: TrainerLanguage
  customTopic?: string
  targetDurationMinutes: number
  cameraEnabled: boolean
}

interface UseTrainerSessionReturn {
  status: TrainerSessionStatus
  isMuted: boolean
  isCameraActive: boolean
  audioLevel: number
  turns: TrainerTurn[]
  currentAiText: string
  currentUserText: string
  elapsedSeconds: number
  errorMessage: string | null
  visualCues: VisualObservations
  savedSession: TrainerSession | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  startSession: (config: SessionConfig) => Promise<void>
  toggleMute: () => void
  toggleCamera: () => Promise<void>
  endSession: () => Promise<TrainerSession | null>
  reset: () => void
}

export function useTrainerSession(): UseTrainerSessionReturn {
  const [status, setStatus] = useState<TrainerSessionStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [turns, setTurns] = useState<TrainerTurn[]>([])
  const [currentAiText, setCurrentAiText] = useState('')
  const [currentUserText, setCurrentUserText] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [visualCues, setVisualCues] = useState<VisualObservations>({})
  const [savedSession, setSavedSession] = useState<TrainerSession | null>(null)

  const configRef = useRef<SessionConfig | null>(null)
  const sessionIdRef = useRef<string>(crypto.randomUUID())
  const startTimeRef = useRef<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  const recorderRef = useRef<LiveAudioRecorder | null>(null)
  const playerRef = useRef<LiveAudioPlayer | null>(null)
  const visualCaptureRef = useRef<VisualCuesCapture | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognizerRef = useRef<any>(null)

  const timerRef = useRef<number | null>(null)
  const frameIntervalRef = useRef<number | null>(null)

  // Timer loop
  useEffect(() => {
    if (status === 'ready' || status === 'listening' || status === 'ai_speaking') {
      if (!timerRef.current) {
        timerRef.current = window.setInterval(() => {
          setElapsedSeconds((prev) => prev + 1)
        }, 1000)
      }
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [status])

  // Cleanup helper
  const cleanupMediaAndSockets = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop()
      recorderRef.current = null
    }
    if (playerRef.current) {
      playerRef.current.close()
      playerRef.current = null
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.abort()
      } catch {
        // Ignored
      }
      speechRecognizerRef.current = null
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    if (visualCaptureRef.current) {
      visualCaptureRef.current.cleanup()
      visualCaptureRef.current = null
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [])

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      cleanupMediaAndSockets()
    }
  }, [cleanupMediaAndSockets])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (recorderRef.current) {
        recorderRef.current.setMuted(next)
      }
      return next
    })
  }, [])

  const toggleCamera = useCallback(async () => {
    if (isCameraActive) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setIsCameraActive(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        })
        cameraStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setIsCameraActive(true)
      } catch {
        // Camera unavailable or denied
      }
    }
  }, [isCameraActive])

  const startSession = useCallback(
    async (config: SessionConfig) => {
      cleanupMediaAndSockets()
      configRef.current = config
      sessionIdRef.current = crypto.randomUUID()
      startTimeRef.current = new Date().toISOString()
      setTurns([])
      setCurrentAiText('')
      setCurrentUserText('')
      setElapsedSeconds(0)
      setErrorMessage(null)
      setIsMuted(false)
      setStatus('requesting_permissions')

      try {
        // 1. Microphone setup
        const player = new LiveAudioPlayer((speaking) => {
          setStatus(speaking ? 'ai_speaking' : 'listening')
        })
        playerRef.current = player

        const recorder = new LiveAudioRecorder(
          (base64Pcm) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'audio', data: base64Pcm }))
            }
          },
          (volume) => {
            setAudioLevel(volume)
          },
        )
        recorderRef.current = recorder
        await recorder.start()

        // 2. Camera setup if enabled
        if (config.cameraEnabled) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            })
            cameraStreamRef.current = stream
            setIsCameraActive(true)
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              videoRef.current.play().catch(() => {})
            }
            visualCaptureRef.current = new VisualCuesCapture()
          } catch (camErr) {
            console.warn('Camera could not be activated:', camErr)
            setIsCameraActive(false)
          }
        }

        // 3. Optional Web Speech for live user transcript & immediate interruption
        const SpeechRecognition =
          // @ts-expect-error WebkitSpeechRecognition
          window.SpeechRecognition || window.webkitSpeechRecognition

        if (SpeechRecognition) {
          try {
            const recognizer = new SpeechRecognition()
            recognizer.continuous = true
            recognizer.interimResults = true
            recognizer.lang =
              config.language === 'Hindi'
                ? 'hi-IN'
                : config.language === 'Hinglish'
                  ? 'en-IN'
                  : 'en-US'

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognizer.onresult = (event: any) => {
              let interim = ''
              let finalTranscript = ''
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcriptPiece = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                  finalTranscript += transcriptPiece
                } else {
                  interim += transcriptPiece
                }
              }

              if (finalTranscript.trim()) {
                setTurns((prev) => [
                  ...prev,
                  { role: 'user', text: finalTranscript.trim(), timestamp: new Date().toISOString() },
                ])
                setCurrentUserText('')

                // User spoke: Interrupt AI if speaking
                if (playerRef.current) {
                  playerRef.current.stopAndClear()
                }
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({ type: 'text', text: finalTranscript.trim() }),
                  )
                }
              } else if (interim.trim()) {
                setCurrentUserText(interim.trim())
                // Immediate interruption trigger on interim speech
                if (playerRef.current) {
                  playerRef.current.stopAndClear()
                }
              }
            }

            recognizer.onerror = () => {
              // Non-fatal, audio stream is primary
            }

            recognizer.onend = () => {
              // Restart recognition if session still active
              if (recorderRef.current && status !== 'ending' && status !== 'completed') {
                try {
                  recognizer.start()
                } catch {
                  // Ignored
                }
              }
            }

            recognizer.start()
            speechRecognizerRef.current = recognizer
          } catch (recErr) {
            console.warn('Web Speech recognition init error:', recErr)
          }
        }

        // 4. Connect to Backend WebSocket
        setStatus('connecting')

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const params = new URLSearchParams({
          mode: config.mode,
          difficulty: config.difficulty,
          language: config.language,
          custom_topic: config.customTopic || '',
        })
        const wsUrl = `${protocol}//${window.location.host}/api/trainer/ws?${params.toString()}`

        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setStatus('ready')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            if (data.type === 'ready') {
              setStatus('listening')
            } else if (data.type === 'audio') {
              if (data.data && playerRef.current) {
                playerRef.current.playChunk(data.data)
              }
            } else if (data.type === 'transcript') {
              if (data.role === 'model' && data.text) {
                setCurrentAiText((prev) => prev + data.text)
              }
            } else if (data.type === 'turn_complete') {
              setCurrentAiText((fullText) => {
                if (fullText.trim()) {
                  setTurns((prev) => [
                    ...prev,
                    { role: 'model', text: fullText.trim(), timestamp: new Date().toISOString() },
                  ])
                }
                return ''
              })
              setStatus('listening')
            } else if (data.type === 'interrupted') {
              if (playerRef.current) {
                playerRef.current.stopAndClear()
              }
              setCurrentAiText('')
              setStatus('listening')
            } else if (data.type === 'error') {
              setErrorMessage(data.message || 'Error communicating with AI coach.')
              setStatus('error')
            }
          } catch (err) {
            console.error('Error handling WebSocket message:', err)
          }
        }

        ws.onerror = () => {
          setErrorMessage('Could not establish connection to the Live Trainer service.')
          setStatus('error')
        }

        ws.onclose = (event) => {
          if (event.code !== 1000 && status !== 'ending' && status !== 'completed') {
            if (event.reason) {
              setErrorMessage(event.reason)
            }
          }
        }

        // 5. Periodic video frame capture if camera is active
        if (config.cameraEnabled) {
          frameIntervalRef.current = window.setInterval(() => {
            if (
              videoRef.current &&
              visualCaptureRef.current &&
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN
            ) {
              const res = visualCaptureRef.current.captureFrame(videoRef.current)
              if (res) {
                setVisualCues(res.cues)
                wsRef.current.send(JSON.stringify({ type: 'image', data: res.base64Jpeg }))
              }
            }
          }, 2500)
        }
      } catch (err) {
        console.error('Failed to start Live Trainer session:', err)
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Permission denied or media hardware unavailable.',
        )
        setStatus('error')
        cleanupMediaAndSockets()
      }
    },
    [cleanupMediaAndSockets, status],
  )

  const endSession = useCallback(async (): Promise<TrainerSession | null> => {
    setStatus('ending')

    // Finalize any in-flight text
    const finalTurns: TrainerTurn[] = [...turns]
    if (currentAiText.trim()) {
      finalTurns.push({
        role: 'model',
        text: currentAiText.trim(),
        timestamp: new Date().toISOString(),
      })
    }
    if (currentUserText.trim()) {
      finalTurns.push({
        role: 'user',
        text: currentUserText.trim(),
        timestamp: new Date().toISOString(),
      })
    }

    // Stop streams
    cleanupMediaAndSockets()

    const config = configRef.current
    if (!config) {
      setStatus('idle')
      return null
    }

    // Build full concatenated transcript for fallback/review
    const fullTranscript = finalTurns
      .map((t) => `${t.role === 'user' ? 'User' : 'AI Trainer'}: ${t.text}`)
      .join('\n')

    const payload: SaveTrainerSessionPayload = {
      id: sessionIdRef.current,
      mode: config.mode,
      difficulty: config.difficulty,
      language: config.language,
      custom_topic: config.customTopic || null,
      target_duration_minutes: config.targetDurationMinutes,
      duration_seconds: elapsedSeconds,
      camera_enabled: isCameraActive,
      transcript: fullTranscript,
      turns: finalTurns,
      visual_observations: visualCues,
      started_at: startTimeRef.current || new Date().toISOString(),
      ended_at: new Date().toISOString(),
    }

    try {
      const session = await saveTrainerSession(payload)
      setSavedSession(session)
      setStatus('completed')
      return session
    } catch (err) {
      console.error('Failed to save session coaching report:', err)
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to generate coaching report.',
      )
      setStatus('error')
      return null
    }
  }, [
    cleanupMediaAndSockets,
    currentAiText,
    currentUserText,
    elapsedSeconds,
    isCameraActive,
    turns,
    visualCues,
  ])

  const reset = useCallback(() => {
    cleanupMediaAndSockets()
    setStatus('idle')
    setTurns([])
    setCurrentAiText('')
    setCurrentUserText('')
    setElapsedSeconds(0)
    setErrorMessage(null)
    setSavedSession(null)
  }, [cleanupMediaAndSockets])

  return {
    status,
    isMuted,
    isCameraActive,
    audioLevel,
    turns,
    currentAiText,
    currentUserText,
    elapsedSeconds,
    errorMessage,
    visualCues,
    savedSession,
    videoRef,
    startSession,
    toggleMute,
    toggleCamera,
    endSession,
    reset,
  }
}
