import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { RequestCommunityComponent } from './request-community.component';

@NgModule({
  declarations: [RequestCommunityComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: RequestCommunityComponent}])]
})
export class RequestCommunityModule {}
