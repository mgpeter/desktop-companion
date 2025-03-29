import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebcamPreviewComponent } from '../../shared/components/webcam-preview/webcam-preview.component';
import { SignalRService, ChatMessage } from '../../core/services/signalr.service';
import { WebcamService } from '../../core/services/webcam.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, WebcamPreviewComponent],
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

  constructor(
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef,
    private webcamService: WebcamService
  ) {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
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
          isFromUser: true
        };

        // Add message to local list immediately
        this.messages.push(message);
        this.messageInput = '';
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        this.scrollToBottom();

        // Send message through SignalR
        this.signalRService.sendMessage(message.text).subscribe({
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
} 