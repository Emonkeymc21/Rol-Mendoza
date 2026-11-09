import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { DmRequestsComponent } from './dm-requests.component';

@NgModule({
  declarations: [DmRequestsComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: DmRequestsComponent}])]
})
export class DmRequestsModule {}
