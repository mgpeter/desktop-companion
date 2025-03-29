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
    startThreshold: 0.24,
    stopThreshold: 0.15,
    silenceThreshold: 2000,
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
    
    console.log('Starting audio stream with config:', {
      sampleRate: finalConfig.sampleRate,
      channels: finalConfig.channels,
      timestamp: new Date().toISOString()
    });

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
        // Verify we have audio tracks
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('No audio tracks found in the media stream');
        }

        console.log('Audio stream initialized:', {
          tracks: audioTracks.map(track => ({
            kind: track.kind,
            label: track.label,
            id: track.id,
            state: track.readyState
          }))
        });

        this.ngZone.run(() => {
          this.stream.next(stream);
          this.setupMediaRecorder(stream);
          this.setupAudioAnalysis(stream, finalConfig);
        });
      }),
      catchError(error => {
        console.error('Error accessing microphone:', {
          error,
          name: error.name,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        
        // Handle specific error cases
        if (error.name === 'NotAllowedError') {
          return throwError(() => new Error('Microphone access was denied. Please check your permission settings.'));
        } else if (error.name === 'NotFoundError') {
          return throwError(() => new Error('No microphone found. Please check your audio device connection.'));
        } else if (error.name === 'NotReadableError') {
          return throwError(() => new Error('Could not access microphone. It might be in use by another application.'));
        }
        
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
        silenceThreshold: config.silenceThreshold,
        hasStream: !!stream,
        streamActive: stream?.active
      });
      
      // Create new audio context
      if (!this.audioContext || this.audioContext.state === 'closed') {
        console.log('Creating new AudioContext');
        this.audioContext = new AudioContext();
      }

      // Always try to resume the context
      if (this.audioContext.state === 'suspended') {
        console.log('Resuming suspended audio context');
        this.audioContext.resume().catch(error => {
          console.error('Error resuming audio context:', error);
        });
      }

      // Clean up existing analyzer if it exists
      if (this.analyzer) {
        try {
          this.analyzer.disconnect();
          console.log('Disconnected existing analyzer');
        } catch (error) {
          console.warn('Error disconnecting existing analyzer:', error);
        }
      }
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 2048;
      this.analyzer.smoothingTimeConstant = config.smoothingTimeConstant;
      source.connect(this.analyzer);

      console.log('Audio analysis setup complete:', {
        contextState: this.audioContext.state,
        analyzerConnected: true,
        timestamp: new Date().toISOString()
      });

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

          // Handle frame counting for silence detection independently of state updates
          if (currentState.isRecording) {
            if (!voiceDetected) {
              lowVolumeFrames++;
              console.debug('Low volume frames:', {
                frames: lowVolumeFrames,
                needed: framesToWait,
                level: normalizedLevel.toFixed(3),
                threshold: threshold.toFixed(3)
              });
              
              if (lowVolumeFrames >= framesToWait) {
                console.log('Silence threshold reached, stopping recording:', {
                  frames: lowVolumeFrames,
                  requiredFrames: framesToWait,
                  level: normalizedLevel.toFixed(3),
                  threshold: threshold.toFixed(3)
                });
                this.stopRecordingInternal().catch(error => {
                  console.error('Error stopping recording:', error);
                });
                lowVolumeFrames = 0;
              }
            } else {
              if (lowVolumeFrames > 0) {
                console.debug('Voice detected, resetting silence counter:', {
                  hadFrames: lowVolumeFrames,
                  level: normalizedLevel.toFixed(3),
                  threshold: threshold.toFixed(3)
                });
              }
              lowVolumeFrames = 0;
            }
          }

          // Handle state updates separately
          if (voiceDetected !== currentState.voiceDetected || Math.abs(normalizedLevel - currentState.audioLevel) > 0.05) {
            // Log voice detection changes
            if (voiceDetected !== currentState.voiceDetected) {
              console.log('Voice detection changed:', {
                wasDetected: currentState.voiceDetected,
                isDetected: voiceDetected,
                level: normalizedLevel.toFixed(3),
                threshold: threshold.toFixed(3)
              });
            }

            // Update monitor state
            this.monitorState.next({
              ...currentState,
              voiceDetected,
              audioLevel: normalizedLevel
            });

            // Handle recording start
            if (voiceDetected && !currentState.isRecording) {
              console.log('Voice detected, starting recording:', {
                level: normalizedLevel.toFixed(3),
                threshold: threshold.toFixed(3)
              });
              this.startRecordingInternal();
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
    
    // Enhanced stream validation
    const currentStream = this.stream.value;
    const needsNewStream = !currentStream || 
                          !currentStream.active || 
                          !currentStream.getAudioTracks().some(track => track.readyState === 'live') ||
                          !this.audioContext ||
                          this.audioContext.state === 'closed';

    if (needsNewStream) {
      console.log('Audio stream needs reinitialization:', {
        hasStream: !!currentStream,
        isActive: currentStream?.active,
        audioTracks: currentStream?.getAudioTracks().map(t => ({
          state: t.readyState,
          label: t.label
        })),
        contextState: this.audioContext?.state
      });

      // Clean up existing resources before reinitializing
      this.cleanupAudioResources();
      
      // Ensure we wait a bit before trying to reinitialize
      setTimeout(() => {
        this.startStream().subscribe({
          next: () => {
            console.log('Successfully reinitialized audio stream');
            this.initializeMonitoring();
          },
          error: (error) => {
            console.error('Failed to reinitialize audio stream:', error);
            // Reset monitoring state on error
            this.monitorState.next({
              isMonitoring: false,
              isRecording: false,
              voiceDetected: false,
              audioLevel: 0
            });
          }
        });
      }, 100); // Small delay to ensure proper cleanup
      return;
    }

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Resume audio context if suspended
    if (this.audioContext?.state === 'suspended') {
      console.log('Resuming audio context');
      this.audioContext.resume().catch(error => {
        console.error('Error resuming audio context:', error);
      });
    }

    // If audio context is closed or null, create a new one
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.log('Creating new audio context');
      this.audioContext = new AudioContext();
      
      // Re-setup audio analysis if we have a stream
      if (this.stream.value) {
        this.setupAudioAnalysis(this.stream.value, this.defaultConfig);
      }
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

  private cleanupAudioResources(): void {
    console.log('Cleaning up audio resources');

    // Stop the audio check loop by setting monitoring to false
    this.monitorState.next({
      ...this.monitorState.value,
      isMonitoring: false,
      isRecording: false,
      voiceDetected: false,
      audioLevel: 0
    });

    // Clean up analyzer
    if (this.analyzer) {
      try {
        this.analyzer.disconnect();
        this.analyzer = null;
        console.log('Analyzer disconnected and nullified');
      } catch (error) {
        console.warn('Error disconnecting analyzer:', error);
      }
    }

    // Clean up audio context
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          console.log('Closing audio context');
          this.audioContext.close();
        }
        this.audioContext = null;
        console.log('Audio context nullified');
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
    }

    // Reset media recorder
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;
        console.log('Media recorder nullified');
      } catch (error) {
        console.warn('Error cleaning up media recorder:', error);
      }
    }

    this.audioChunks = [];
    this.checkAudioLevel = null;
  }

  stopMonitoring(): void {
    console.log('Stopping voice monitoring');
    
    // Clear any pending timeouts
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    // Stop recording if active
    const stopRecordingPromise = this.monitorState.value.isRecording ? 
      this.stopRecordingInternal() : 
      Promise.resolve();

    stopRecordingPromise
      .catch(error => {
        console.error('Error stopping recording during monitoring stop:', error);
      })
      .finally(() => {
        // Update monitor state
        this.monitorState.next({
          isMonitoring: false,
          isRecording: false,
          voiceDetected: false,
          audioLevel: 0
        });

        // Clean up audio resources
        this.cleanupAudioResources();
      });
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
    console.log('Stopping audio stream');
    const currentStream = this.stream.value;
    if (currentStream) {
      // Stop all audio tracks
      currentStream.getAudioTracks().forEach(track => {
        console.log('Stopping audio track:', {
          kind: track.kind,
          label: track.label,
          id: track.id,
          state: track.readyState
        });
        track.stop();
      });
    }
    
    // Clean up all resources
    this.cleanupAudioResources();
    this.stream.next(null);
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