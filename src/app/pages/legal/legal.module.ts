import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { LegalComponent } from './legal.component';

@NgModule({
  declarations: [LegalComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: LegalComponent}])]
})
export class LegalModule {}
