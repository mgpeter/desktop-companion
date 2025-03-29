import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebcamPreviewComponent } from '../../shared/components/webcam-preview/webcam-preview.component';
import { SignalRService, ChatMessage } from '../../core/services/signalr.service';
import { WebcamService } from '../../core/services/webcam.service';
import { AudioService } from '../../core/services/audio.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AudioControlsComponent } from '../../shared/components/audio-controls/audio-controls.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WebcamPreviewComponent,
    AudioControlsComponent
  ],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messageContainer') private messageContainer?: ElementRef;

  messageInput = '';
  messages: ChatMessage[] = [];
  isConnected = false;
  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser: boolean;
  private currentlyPlayingMessage: ChatMessage | null = null;
  private isAudioPlaying = false;

  constructor(
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef,
    private webcamService: WebcamService,
    public audioService: AudioService
  ) {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    // Subscribe to audio playback state
    this.audioService.playbackState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {        
        this.isAudioPlaying = state.isPlaying;
        
        // If playback stopped, clear the current message
        if (!state.isPlaying) {
          this.currentlyPlayingMessage = null;
        }
        
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    // Initial scroll to bottom
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.messageContainer && this.isBrowser) {
      try {
        // Use requestAnimationFrame to ensure smooth scrolling after DOM updates
        requestAnimationFrame(() => {
          const element = this.messageContainer!.nativeElement;
          // Add a small delay to ensure DOM has updated
          setTimeout(() => {
            element.scrollTop = element.scrollHeight;
            // Double-check scroll position after a brief delay
            setTimeout(() => {
              if (element.scrollTop + element.clientHeight < element.scrollHeight) {
                element.scrollTop = element.scrollHeight;
              }
            }, 50);
          }, 10);
        });
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      console.log('Chat: Skipping SignalR connection in SSR');
      return;
    }

    // Monitor connection state
    this.signalRService.isConnected()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        console.log('Chat: SignalR connection state changed:', connected);
        this.isConnected = connected;
        this.cdr.markForCheck();
      });

    // Listen for incoming messages
    this.signalRService.onMessageReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('Chat: Message received:', message);
        this.messages.push(message);
        this.cdr.markForCheck();
        // Ensure view is updated before scrolling
        this.cdr.detectChanges();
        this.scrollToBottom();
      });

    this.signalRService.onTranscriptionReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe(transcription => {
        console.log('Chat: Transcription received:', transcription);
        this.messageInput = transcription;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        this.sendMessage();
      });

    // Start SignalR connection
    this.signalRService.startConnection().subscribe({
      next: (success) => {
        console.log('Chat: SignalR connection attempt result:', success);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Chat: Failed to connect to chat hub:', error);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.isBrowser) {
      this.signalRService.stopConnection().subscribe();
    }
  }

  async sendMessage() {
    if (this.messageInput.trim() && this.isConnected) {
      try {
        // Try to capture frame if webcam is active
        const isWebcamActive = await firstValueFrom(this.webcamService.isStreamActive$);
        let frameData: string | null = null;

        if (isWebcamActive) {
          console.log('Webcam active, attempting to capture frame...');
          frameData = await this.webcamService.captureFrame();
          console.log('Frame captured:', frameData ? 'Successfully captured frame' : 'Failed to capture frame');

          // Log the first 100 chars of the base64 string to avoid console spam
          if (frameData) {
            console.log('Frame data preview:', frameData.substring(0, 100) + '...');
          }
        } else {
          console.log('Webcam not active, skipping frame capture');
        }

        const message: ChatMessage = {
          text: this.messageInput.trim(),
          timestamp: new Date(),
          isFromUser: true,
          imageData: frameData || undefined
        };

        // Add message to local list immediately
        this.messages.push(message);
        this.messageInput = '';
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        this.scrollToBottom();

        // Send message through SignalR
        this.signalRService.sendMessage(message.text, message.imageData).subscribe({
          error: (error) => {
            console.error('Chat: Failed to send message:', error);
            this.messages = this.messages.filter(m => m !== message);
            this.cdr.markForCheck();
          }
        });
      } catch (error) {
        console.error('Error in sendMessage:', error);
      }
    }
  }

  async handleAudioRecorded(audioBlob: Blob): Promise<void> {
    try {
      await firstValueFrom(this.signalRService.sendAudioMessage(audioBlob));
    } catch (error) {
      console.error('Error sending audio message:', error);
    }
  }

  async handleAudioPlayback(message: ChatMessage): Promise<void> {
    try {
      const isCurrentlyPlaying = this.isPlayingAudio(message);
      console.log('Handle audio playback:', {
        messageText: message.text?.substring(0, 50),
        isCurrentlyPlaying,
        isAudioPlaying: this.isAudioPlaying,
        currentPlayingMessage: this.currentlyPlayingMessage?.text?.substring(0, 50)
      });

      // If this message is currently playing, stop it
      if (isCurrentlyPlaying) {
        console.log('Stopping current message playback');
        await this.audioService.stopPlayback();
        return;
      }

      // Set the new message as current before starting playback
      // This ensures the UI updates immediately
      const previousMessage = this.currentlyPlayingMessage;
      this.currentlyPlayingMessage = null;
      this.cdr.markForCheck();
      // If another message is playing, stop it first
      if (previousMessage) {
        console.log('Stopping previous message before playing new one');
        try {
          await this.audioService.stopPlayback();
          // Small delay to ensure audio has stopped
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error('Error stopping previous audio:', error);
          // Restore previous state if stop failed
          this.currentlyPlayingMessage = previousMessage;
          this.cdr.markForCheck();
          return;
        }
      }

      // Start playing the new message
      console.log('Starting new message playback');
      this.currentlyPlayingMessage = message;
      await this.audioService.playAudio(message.audioData!);
      
    } catch (error) {
      console.error('Error handling audio playback:', error);
      this.currentlyPlayingMessage = null;
      this.isAudioPlaying = false;
      this.cdr.markForCheck();
    }
  }

  isPlayingAudio(message: ChatMessage): boolean {
    const isPlaying = this.currentlyPlayingMessage === message && this.isAudioPlaying;

    return isPlaying;
  }
} 