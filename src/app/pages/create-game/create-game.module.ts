import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { CreateGameComponent } from './create-game.component';

@NgModule({
  declarations: [CreateGameComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: CreateGameComponent}])]
})
export class CreateGameModule {}
