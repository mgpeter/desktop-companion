import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

// Add ImageCapture type definition
declare class ImageCapture {
  constructor(videoTrack: MediaStreamTrack);
  takePhoto(): Promise<Blob>;
}

export interface WebcamConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
}

@Injectable({
  providedIn: 'root'
})
export class WebcamService {
  private stream = new BehaviorSubject<MediaStream | null>(null);
  private defaultConfig: WebcamConfig = {
    width: 640,
    height: 480,
    facingMode: 'user'
  };

  constructor(private ngZone: NgZone) {}

  get stream$(): Observable<MediaStream | null> {
    return this.stream.asObservable();
  }

  get isStreamActive$(): Observable<boolean> {
    return this.stream$.pipe(
      map(stream => stream !== null && stream.active)
    );
  }

  startStream(config: Partial<WebcamConfig> = {}): Observable<MediaStream> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: finalConfig.width },
        height: { ideal: finalConfig.height },
        facingMode: finalConfig.facingMode
      }
    };

    return from(navigator.mediaDevices.getUserMedia(constraints)).pipe(
      tap(stream => {
        // Ensure we're in the Angular zone when updating the stream
        this.ngZone.run(() => {
          this.stream.next(stream);
        });
      }),
      catchError(error => {
        console.error('Error accessing webcam:', error);
        return throwError(() => new Error('Could not access webcam. Please ensure you have granted camera permissions.'));
      })
    );
  }

  stopStream(): void {
    const currentStream = this.stream.value;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      this.stream.next(null);
    }
  }

  /**
   * Captures the current frame from the active stream.
   * @returns Promise<string | null> A promise that resolves to the base64 encoded PNG image, or null if capture fails
   */
  async captureFrame(): Promise<string | null> {
    const stream = this.stream.value;
    if (!stream || !stream.active) {
      console.log('No active stream to capture frame from');
      return null;
    }

    // Get the video track
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('No video track found in stream');
      return null;
    }

    try {
      // Check if ImageCapture is supported
      if ('ImageCapture' in window) {
        console.log('Using ImageCapture API');
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        const blob = await imageCapture.takePhoto();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        console.log('ImageCapture not supported, falling back to canvas method');
        return this.captureFrameUsingCanvas(stream);
      }
    } catch (error) {
      console.error('Error capturing frame with ImageCapture, falling back to canvas:', error);
      return this.captureFrameUsingCanvas(stream);
    }
  }

  /**
   * Fallback method to capture frame using canvas when ImageCapture is not supported
   */
  private async captureFrameUsingCanvas(stream: MediaStream): Promise<string | null> {
    try {
      // Create a video element
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Create a canvas to capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current frame
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64 PNG
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Canvas frame capture failed:', error);
      return null;
    }
  }
} 