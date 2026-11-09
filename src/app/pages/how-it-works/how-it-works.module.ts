import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { HowItWorksComponent } from './how-it-works.component';

@NgModule({
  declarations: [HowItWorksComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: HowItWorksComponent}])]
})
export class HowItWorksModule {}
