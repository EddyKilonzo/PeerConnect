import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  show: boolean;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%) scale(0.95)', opacity: 0 }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'translateX(0) scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'translateX(100%) scale(0.95)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  @Input() toasts: ToastMessage[] = [];
  @Output() toastRemoved = new EventEmitter<string>();

  ngOnInit() {
    // Auto-remove toasts after duration
    this.toasts.forEach(toast => {
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          this.removeToast(toast.id);
        }, toast.duration);
      }
    });
  }

  ngOnDestroy() {
    // Cleanup any remaining timeouts if needed
  }

  removeToast(id: string) {
    this.toastRemoved.emit(id);
  }

  getIconClass(type: string): string {
    return `icon-${type}`;
  }

  getTitle(type: string): string {
    const titles = {
      success: 'Success!',
      error: 'Failed!',
      warning: 'Warning!',
      info: 'Info'
    };
    return titles[type as keyof typeof titles] || 'Notification';
  }
}
