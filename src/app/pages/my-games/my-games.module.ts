import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { MyGamesComponent } from './my-games.component';

@NgModule({
  declarations: [MyGamesComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedUiModule, RouterModule.forChild([{path: '', component: MyGamesComponent}])]
})
export class MyGamesModule {}
