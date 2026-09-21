import { Component, Input } from '@angular/core';
import { AvatarClass, avatarClassLabel, isAvatarClass } from '../../../core/data/avatar-classes';

@Component({
  selector: 'app-class-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.scss']
})
export class ClassAvatarComponent {
  @Input() avatarClass: AvatarClass | string = 'FIGHTER';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get resolvedClass(): AvatarClass | 'NEUTRAL' {
    return isAvatarClass(this.avatarClass) ? this.avatarClass : 'NEUTRAL';
  }

  get label(): string {
    return this.resolvedClass === 'NEUTRAL' ? 'Cumbre20' : avatarClassLabel(this.resolvedClass);
  }
}
