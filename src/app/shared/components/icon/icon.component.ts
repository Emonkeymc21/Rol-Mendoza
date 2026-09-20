import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName = 'search' | 'users' | 'dice' | 'map' | 'calendar' | 'menu' | 'close' | 'arrow' | 'plus' | 'shield' | 'sparkles' | 'filter' | 'check' | 'clock' | 'heart' | 'home' | 'user' | 'edit' | 'logout' | 'chevron' | 'instagram' | 'whatsapp';

@Component({ selector: 'app-icon', standalone: true, imports: [CommonModule], templateUrl: './icon.component.html', styleUrls: ['./icon.component.scss'] })
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
}
