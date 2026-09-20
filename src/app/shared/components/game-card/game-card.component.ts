import { Component, Input } from '@angular/core';
import { Game } from '../../../core/models/game.model';

@Component({ selector: 'app-game-card', templateUrl: './game-card.component.html', styleUrls: ['./game-card.component.scss'] })
export class GameCardComponent { @Input({ required: true }) game!: Game; }
