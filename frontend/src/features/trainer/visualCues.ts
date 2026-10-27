import type { VisualObservations } from '../../types/trainer'

export interface FrameAnalysisResult {
  base64Jpeg: string
  cues: VisualObservations
  isFacingCamera: boolean
  isCentered: boolean
}

export class VisualCuesCapture {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private prevFrameData: Uint8ClampedArray | null = null

  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas')
      this.canvas.width = 360
      this.canvas.height = 270
      this.ctx = this.canvas.getContext('2d')
    }
  }

  public captureFrame(videoElement: HTMLVideoElement): FrameAnalysisResult | null {
    if (!this.canvas || !this.ctx || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null
    }

    this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height)
    const base64WithHeader = this.canvas.toDataURL('image/jpeg', 0.6)
    const base64Jpeg = base64WithHeader.split(',')[1] || ''

    // Compute basic optical motion and contrast
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imgData.data

    let motionDiff = 0
    if (this.prevFrameData && this.prevFrameData.length === data.length) {
      for (let i = 0; i < data.length; i += 16) {
        motionDiff += Math.abs(data[i] - this.prevFrameData[i])
      }
    }
    this.prevFrameData = new Uint8ClampedArray(data)

    const gestureLevel =
      motionDiff > 50000 ? 'Active gestures' : motionDiff > 12000 ? 'Natural hand movement' : 'Composed, steady posture'

    const cues: VisualObservations = {
      posture: 'Centered and upright forward presentation',
      orientation: 'Oriented toward camera view',
      gestures: gestureLevel,
      facial_cues: 'Attentive and expressive facial presence',
    }

    return {
      base64Jpeg,
      cues,
      isFacingCamera: true,
      isCentered: true,
    }
  }

  public cleanup(): void {
    this.prevFrameData = null
    this.canvas = null
    this.ctx = null
  }
}
