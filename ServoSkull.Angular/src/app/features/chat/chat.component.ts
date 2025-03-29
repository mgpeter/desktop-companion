import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html'
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