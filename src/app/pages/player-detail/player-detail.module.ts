import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { PlayerDetailComponent } from './player-detail.component';

@NgModule({
  declarations: [PlayerDetailComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: PlayerDetailComponent}])]
})
export class PlayerDetailModule {}
