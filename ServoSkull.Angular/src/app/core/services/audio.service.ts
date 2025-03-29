import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError, Subject } from 'rxjs';
import { catchError, tap, map, debounceTime } from 'rxjs/operators';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  startThreshold: number;  // Threshold to start recording
  stopThreshold: number;   // Lower threshold to maintain recording
  silenceThreshold: number;  // Time in ms to consider silence as end of speech
  smoothingTimeConstant: number; // Smoothing factor for audio analysis
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
}

export interface AudioMonitorState {
  isMonitoring: boolean;
  isRecording: boolean;
  voiceDetected: boolean;
  audioLevel: number;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private stream = new BehaviorSubject<MediaStream | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = new BehaviorSubject<boolean>(false);
  private monitorState = new BehaviorSubject<AudioMonitorState>({
    isMonitoring: false,
    isRecording: false,
    voiceDetected: false,
    audioLevel: 0
  });
  private playbackState = new BehaviorSubject<AudioPlaybackState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0
  });
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private silenceTimeout: any = null;
  
  private defaultConfig: AudioConfig = {
    sampleRate: 16000,
    channels: 1,
    startThreshold: 0.09,    
    stopThreshold: 0.09,     
    silenceThreshold: 1500,
    smoothingTimeConstant: 0.8
  };

  constructor(private ngZone: NgZone) {}

  get stream$(): Observable<MediaStream | null> {
    return this.stream.asObservable();
  }

  get isRecording$(): Observable<boolean> {
    return this.isRecording.asObservable();
  }

  get monitorState$(): Observable<AudioMonitorState> {
    return this.monitorState.asObservable();
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
          this.setupAudioAnalysis(stream, finalConfig);
        });
      }),
      catchError(error => {
        console.error('Error accessing microphone:', error);
        return throwError(() => new Error('Could not access microphone. Please ensure you have granted audio permissions.'));
      })
    );
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

    try {
      console.log('Setting up MediaRecorder with mime type:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps audio
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.debug('Received audio chunk:', {
            size: event.data.size,
            type: event.data.type,
            timestamp: new Date().toISOString()
          });
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.isRecording.next(false);
        this.monitorState.next({
          ...this.monitorState.value,
          isRecording: false,
          voiceDetected: false
        });
      };

      console.log('MediaRecorder setup complete');
    } catch (error) {
      console.error('Error setting up MediaRecorder:', error);
    }
  }

  private setupAudioAnalysis(stream: MediaStream, config: AudioConfig) {
    try {
      console.log('Setting up audio analysis with config:', {
        startThreshold: config.startThreshold,
        stopThreshold: config.stopThreshold,
        silenceThreshold: config.silenceThreshold
      });
      
      // Create new audio context if needed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 2048;
      this.analyzer.smoothingTimeConstant = config.smoothingTimeConstant;
      source.connect(this.analyzer);

      const bufferLength = this.analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Keep track of consecutive frames below stop threshold
      let lowVolumeFrames = 0;
      const framesPerSecond = 60; // Assuming 60fps for requestAnimationFrame
      const framesToWait = Math.ceil((config.silenceThreshold / 1000) * framesPerSecond);

      const checkAudioLevel = () => {
        if (!this.analyzer || !this.monitorState.value.isMonitoring) {
          console.debug('Audio check loop stopped:', {
            hasAnalyzer: !!this.analyzer,
            isMonitoring: this.monitorState.value.isMonitoring
          });
          return;
        }

        this.analyzer.getByteFrequencyData(dataArray);
        
        // Calculate RMS value with improved accuracy
        let sum = 0;
        let nonZeroCount = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i] / 255;
          if (value > 0) {
            sum += value * value;
            nonZeroCount++;
          }
        }
        const normalizedLevel = Math.sqrt(sum / (nonZeroCount || bufferLength));
        
        this.ngZone.run(() => {
          const currentState = this.monitorState.value;
          const threshold = currentState.isRecording ? config.stopThreshold : config.startThreshold;
          const voiceDetected = normalizedLevel > threshold;

          // Log significant level changes
          if (normalizedLevel > 0.02) {
            console.debug('Audio level:', {
              level: normalizedLevel.toFixed(3),
              threshold: threshold.toFixed(3),
              isRecording: currentState.isRecording,
              lowVolumeFrames
            });
          }
          
          // Update state if significant change
          if (voiceDetected !== currentState.voiceDetected || Math.abs(normalizedLevel - currentState.audioLevel) > 0.05) {
            if (voiceDetected !== currentState.voiceDetected) {
              console.log('Voice detection changed:', {
                wasDetected: currentState.voiceDetected,
                isDetected: voiceDetected,
                level: normalizedLevel.toFixed(3),
                threshold: threshold.toFixed(3)
              });
            }
            
            this.monitorState.next({
              ...currentState,
              voiceDetected,
              audioLevel: normalizedLevel
            });

            // Handle recording state
            if (voiceDetected && !currentState.isRecording) {
              console.log('Voice detected above start threshold, starting recording');
              lowVolumeFrames = 0;
              this.startRecordingInternal();
            } else if (!voiceDetected && currentState.isRecording) {
              lowVolumeFrames++;
              console.log('Low volume frames:', lowVolumeFrames);
              
              if (lowVolumeFrames >= framesToWait) {
                console.log('Sustained silence detected, stopping recording:', {
                  frames: lowVolumeFrames,
                  threshold: config.stopThreshold,
                  duration: config.silenceThreshold
                });
                this.stopRecordingInternal();
                lowVolumeFrames = 0;
              }
            } else if (voiceDetected && currentState.isRecording) {
              // Reset counter if we detect voice while recording
              lowVolumeFrames = 0;
            }
          }
        });

        // Continue monitoring loop
        requestAnimationFrame(checkAudioLevel);
      };

      // Store the function for later use
      this.checkAudioLevel = checkAudioLevel;
      
      // Start monitoring if already enabled
      if (this.monitorState.value.isMonitoring) {
        console.log('Starting initial audio check loop');
        requestAnimationFrame(checkAudioLevel);
      }
      
      console.log('Audio analysis setup complete');
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
      throw error;
    }
  }

  private checkAudioLevel: (() => void) | null = null;

  startMonitoring(): void {
    console.log('Starting voice monitoring');
    
    // Ensure audio context is resumed (needed due to autoplay policies)
    if (this.audioContext?.state === 'suspended') {
      console.log('Resuming audio context');
      this.audioContext.resume();
    }

    this.monitorState.next({
      ...this.monitorState.value,
      isMonitoring: true
    });

    // Start the audio level checking loop
    if (this.checkAudioLevel) {
      console.log('Starting audio level check loop');
      requestAnimationFrame(this.checkAudioLevel);
    } else {
      console.error('Audio analysis not properly initialized');
    }
  }

  stopMonitoring(): void {
    console.log('Stopping voice monitoring');
    
    // Clear any pending timeouts
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    // Stop recording if active and update state after it completes
    if (this.monitorState.value.isRecording) {
      this.stopRecordingInternal().catch(error => {
        console.error('Error stopping recording during monitoring stop:', error);
      }).finally(() => {
        // Update monitor state after recording is stopped
        this.monitorState.next({
          isMonitoring: false,
          isRecording: false,
          voiceDetected: false,
          audioLevel: 0
        });

        // Suspend audio context to save resources
        if (this.audioContext?.state === 'running') {
          console.log('Suspending audio context');
          this.audioContext.suspend().catch(error => {
            console.error('Error suspending audio context:', error);
          });
        }
      });
    } else {
      // If not recording, update state immediately
      this.monitorState.next({
        isMonitoring: false,
        isRecording: false,
        voiceDetected: false,
        audioLevel: 0
      });

      // Suspend audio context to save resources
      if (this.audioContext?.state === 'running') {
        console.log('Suspending audio context');
        this.audioContext.suspend().catch(error => {
          console.error('Error suspending audio context:', error);
        });
      }
    }
  }

  private startRecordingInternal(): void {
    console.log('Voice detected, starting recording');
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'inactive') {
      console.error('MediaRecorder not ready or already recording');
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder.start(1000);
    this.monitorState.next({
      ...this.monitorState.value,
      isRecording: true
    });
    this.isRecording.next(true);
  }

  private stopRecordingInternal(): Promise<void> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      console.debug('No active recording to stop');
      return Promise.resolve();
    }

    console.log('Stopping recording:', {
      state: this.mediaRecorder.state,
      chunksCount: this.audioChunks.length,
      timestamp: new Date().toISOString()
    });

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        // Reset recording state immediately
        this.ngZone.run(() => {
          this.monitorState.next({
            ...this.monitorState.value,
            isRecording: false,
            voiceDetected: false
          });
          this.isRecording.next(false);
        });
      };

      try {
        // Set up stop handler
        this.mediaRecorder!.onstop = () => {
          try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            console.log('Recording stopped:', {
              size: audioBlob.size,
              type: audioBlob.type,
              chunksCount: this.audioChunks.length
            });
            
            this.audioChunks = [];
            cleanup();
            
            // Emit the recorded audio
            this.ngZone.run(() => {
              this.audioRecorded.next(audioBlob);
            });
            
            resolve();
          } catch (error) {
            console.error('Error processing recorded audio:', error);
            cleanup();
            reject(error);
          }
        };

        // Stop the recording
        this.mediaRecorder!.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
        cleanup();
        reject(error);
      }
    });
  }

  // Event emitter for completed recordings
  private audioRecorded = new Subject<Blob>();
  get audioRecorded$(): Observable<Blob> {
    return this.audioRecorded.asObservable();
  }

  stopStream(): void {
    const currentStream = this.stream.value;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      this.stream.next(null);
    }
    this.mediaRecorder = null;
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