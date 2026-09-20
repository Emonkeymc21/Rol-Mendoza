import { Component } from '@angular/core';

@Component({ selector: 'app-dice-roller', templateUrl: './dice-roller.component.html', styleUrls: ['./dice-roller.component.scss'] })
export class DiceRollerComponent {
  result = 20;
  rolling = false;
  rolls = 0;
  private readonly phrases = ['La aventura te está buscando.', 'Hay una mesa esperándote.', 'Tu próxima historia empieza acá.', 'Crítico: hoy se arma mesa.', 'El destino pide dados.'];
  phrase = this.phrases[3];

  roll(): void {
    if (this.rolling) return;
    this.rolling = true;
    this.rolls++;
    let ticks = 0;
    const timer = window.setInterval(() => {
      this.result = Math.floor(Math.random() * 20) + 1;
      ticks++;
      if (ticks >= 9) {
        window.clearInterval(timer);
        this.rolling = false;
        this.phrase = this.result === 20 ? '¡Crítico! La próxima mesa es tuya.' : this.result === 1 ? 'Pifia elegante. Volvé a tirar.' : this.phrases[this.result % this.phrases.length];
      }
    }, 70);
  }
}
