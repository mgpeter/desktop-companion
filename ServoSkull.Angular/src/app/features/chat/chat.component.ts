import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebcamPreviewComponent } from '../../shared/components/webcam-preview/webcam-preview.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, WebcamPreviewComponent],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent {
  messageInput = '';

  sendMessage() {
    if (this.messageInput.trim()) {
      // TODO: Implement message sending
      console.log('Message sent:', this.messageInput);
      this.messageInput = '';
    }
  }
} 