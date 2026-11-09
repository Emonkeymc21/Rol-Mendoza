import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


export type IconName = 'search' | 'users' | 'dice' | 'map' | 'calendar' | 'menu' | 'close' | 'arrow' | 'plus' | 'shield' | 'sparkles' | 'filter' | 'check' | 'clock' | 'heart' | 'home' | 'user' | 'edit' | 'logout' | 'chevron' | 'instagram' | 'whatsapp' | 'bell' | 'sun' | 'moon' | 'monitor' | 'share' | 'copy';

@Component({
    selector: 'app-icon', imports: [], templateUrl: './icon.component.html', changeDetection: ChangeDetectionStrategy.Eager,
 styleUrls: ['./icon.component.scss']
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
}
