import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private stream = new BehaviorSubject<MediaStream | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = new BehaviorSubject<boolean>(false);
  
  private defaultConfig: AudioConfig = {
    sampleRate: 16000, // Whisper prefers 16kHz
    channels: 1 // Mono audio
  };

  constructor(private ngZone: NgZone) {}

  get stream$(): Observable<MediaStream | null> {
    return this.stream.asObservable();
  }

  get isRecording$(): Observable<boolean> {
    return this.isRecording.asObservable();
  }

  startStream(config: Partial<AudioConfig> = {}): Observable<MediaStream> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const constraints: MediaStreamConstraints = {
      audio: {
        sampleRate: finalConfig.sampleRate,
        channelCount: finalConfig.channels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    return from(navigator.mediaDevices.getUserMedia(constraints)).pipe(
      tap(stream => {
        this.ngZone.run(() => {
          this.stream.next(stream);
          this.setupMediaRecorder(stream);
        });
      }),
      catchError(error => {
        console.error('Error accessing microphone:', error);
        return throwError(() => new Error('Could not access microphone. Please ensure you have granted audio permissions.'));
      })
    );
  }

  stopStream(): void {
    const currentStream = this.stream.value;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      this.stream.next(null);
    }
    this.mediaRecorder = null;
  }

  startRecording(): void {
    console.log('Attempting to start recording...', {
      recorderExists: !!this.mediaRecorder,
      state: this.mediaRecorder?.state
    });

    if (!this.mediaRecorder) {
      console.error('MediaRecorder not initialized');
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder.start(1000); // Capture chunks every second
    this.isRecording.next(true);
    console.log('Recording started');
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];
        this.isRecording.next(false);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private setupMediaRecorder(stream: MediaStream): void {
    // Check for supported MIME types
    const mimeType = [
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav'
    ].find(type => MediaRecorder.isTypeSupported(type)) || '';

    if (!mimeType) {
      console.error('No supported audio MIME types found');
      return;
    }

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000 // 128kbps audio
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      this.isRecording.next(false);
    };
  }
} 