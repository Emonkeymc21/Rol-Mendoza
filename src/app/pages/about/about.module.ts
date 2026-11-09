import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { AboutComponent } from './about.component';

@NgModule({
  declarations: [AboutComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: AboutComponent}])]
})
export class AboutModule {}
