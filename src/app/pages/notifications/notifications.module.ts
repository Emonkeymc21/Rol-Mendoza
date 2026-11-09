import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { NotificationsComponent } from './notifications.component';

@NgModule({
  declarations: [NotificationsComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: NotificationsComponent}])]
})
export class NotificationsModule {}
