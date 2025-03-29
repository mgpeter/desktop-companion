import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

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
} 