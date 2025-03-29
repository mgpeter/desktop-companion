import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private stream = new BehaviorSubject<MediaStream | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = new BehaviorSubject<boolean>(false);
  private playbackState = new BehaviorSubject<AudioPlaybackState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0
  });
  private currentAudio: HTMLAudioElement | null = null;
  
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

  get playbackState$(): Observable<AudioPlaybackState> {
    return this.playbackState.asObservable();
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

  async playAudio(base64Audio: string): Promise<void> {
    try {
      console.group('Audio Playback');
      console.log('Starting audio playback process');
      
      // Stop any currently playing audio
      await this.stopPlayback();

      // Convert base64 to blob
      const base64Data = this.stripDataUrlPrefix(base64Audio);
      const binaryData = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
      console.log('Audio data processed:', {
        originalSize: base64Audio.length,
        blobSize: audioBlob.size,
        mimeType: audioBlob.type,
        timestamp: new Date().toISOString()
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Audio URL created');
      
      // Create and play audio
      this.currentAudio = new Audio(audioUrl);
      
      // Set up event handlers
      this.currentAudio.onloadedmetadata = () => this.ngZone.run(() => {
        if (this.currentAudio) {
          console.log('Audio metadata loaded:', {
            duration: this.currentAudio.duration,
            playbackRate: this.currentAudio.playbackRate,
            timestamp: new Date().toISOString()
          });
        }
      });

      this.currentAudio.onplay = () => this.ngZone.run(() => {
        console.log('Audio playback started');
        this.playbackState.next({
          ...this.playbackState.value,
          isPlaying: true
        });
      });

      this.currentAudio.onpause = () => this.ngZone.run(() => {
        console.log('Audio playback paused');
        this.playbackState.next({
          ...this.playbackState.value,
          isPlaying: false
        });
      });

      this.currentAudio.ontimeupdate = () => this.ngZone.run(() => {
        if (this.currentAudio) {
          this.playbackState.next({
            isPlaying: !this.currentAudio.paused,
            duration: this.currentAudio.duration,
            currentTime: this.currentAudio.currentTime
          });
        }
      });

      this.currentAudio.onended = () => this.ngZone.run(() => {
        console.log('Audio playback completed');
        this.stopPlayback();
        URL.revokeObjectURL(audioUrl);
      });

      // Start playback
      await this.currentAudio.play();
      console.groupEnd();
    } catch (error) {
      console.error('Audio playback error:', {
        error,
        timestamp: new Date().toISOString(),
        state: this.playbackState.value
      });
      this.stopPlayback();
      console.groupEnd();
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    if (this.currentAudio) {
      try {
        console.log('Stopping audio playback', {
          currentTime: this.currentAudio.currentTime,
          duration: this.currentAudio.duration,
          timestamp: new Date().toISOString()
        });
        
        await this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
        this.playbackState.next({
          isPlaying: false,
          duration: 0,
          currentTime: 0
        });
      } catch (error) {
        console.error('Error stopping audio playback:', {
          error,
          timestamp: new Date().toISOString(),
          state: this.playbackState.value
        });
        throw error;
      }
    }
  }

  private stripDataUrlPrefix(dataUrl: string): string {
    const prefix = 'base64,';
    const index = dataUrl.indexOf(prefix);
    return index >= 0 ? dataUrl.slice(index + prefix.length) : dataUrl;
  }
} 