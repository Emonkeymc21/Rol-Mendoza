import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { CompleteProfileComponent } from './complete-profile.component';

@NgModule({
  declarations: [CompleteProfileComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: CompleteProfileComponent}])]
})
export class CompleteProfileModule {}
