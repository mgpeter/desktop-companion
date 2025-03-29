import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebcamPreviewComponent } from '../../shared/components/webcam-preview/webcam-preview.component';
import { SignalRService } from '../../core/services/signalr.service';
import { Subject, takeUntil } from 'rxjs';

interface ChatMessage {
  text: string;
  timestamp: Date;
  isFromUser: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, WebcamPreviewComponent],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  messageInput = '';
  messages: ChatMessage[] = [];
  isConnected = false;
  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser: boolean;

  constructor(
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
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

  sendMessage() {
    if (this.messageInput.trim()) {
      const message: ChatMessage = {
        text: this.messageInput.trim(),
        timestamp: new Date(),
        isFromUser: true
      };
      
      this.messages.push(message);
      this.messageInput = '';
      this.cdr.markForCheck();

      // TODO: Once we implement message handling in SignalRService, we'll call it here
      console.log('Message sent:', message);
    }
  }
} 