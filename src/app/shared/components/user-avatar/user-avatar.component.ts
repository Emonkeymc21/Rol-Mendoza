import { Component, Input, OnChanges } from '@angular/core';
import { AvatarType } from '../../../core/data/avatar-options';

@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.scss']
})
export class UserAvatarComponent implements OnChanges {
  @Input() photoURL = '';
  @Input() avatarType: AvatarType = 'WARRIOR';
  @Input() name = 'Miembro de Cumbre20';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  imageFailed = false;

  ngOnChanges(): void {
    this.imageFailed = false;
  }

  useFallback(): void {
    this.imageFailed = true;
  }
}
