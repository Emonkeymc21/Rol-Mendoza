import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CommunityService } from '../../core/services/community.service';
import { Game } from '../../core/models/game.model';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-create-game', templateUrl: './create-game.component.html', styleUrls: ['./create-game.component.scss'] })
export class CreateGameComponent {
  submitted = false;
  saving = false;
  createdId = '';
  resultMessage = '';
  saveError = '';
  pendingReview = false;
  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]], system: ['', Validators.required],
    location: ['', Validators.required], mode: ['Presencial' as Game['mode'], Validators.required], schedule: ['', Validators.required],
    frequency: ['One-shot', Validators.required], seats: [2, [Validators.required, Validators.min(1), Validators.max(12)]],
    totalSeats: [5, [Validators.required, Validators.min(2), Validators.max(12)]], level: ['Principiantes bienvenidos', Validators.required],
    summary: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(420)]], tone: ['', Validators.required],
    safety: ['Líneas y velos + tarjeta X', Validators.required], tags: ['Narrativa, Aventura']
  });

  constructor(private fb: FormBuilder, private community: CommunityService, readonly auth: AuthService) {}

  save(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const user = this.auth.currentUser;
    if (!user) { this.saveError = 'Necesitás iniciar sesión para publicar una partida.'; return; }
    this.saving = true;
    this.saveError = '';
    const value = this.form.getRawValue();
    const id = `${this.slugify(value.title)}-${Date.now().toString().slice(-5)}`;
    const gm = user.displayName || user.email?.split('@')[0] || 'Máster de la comunidad';
    this.community.addGame({ ...value, id, gm, tags: value.tags.split(',').map(tag => tag.trim()).filter(Boolean), featured: false }).subscribe({
      next: result => {
        this.createdId = result.id;
        this.resultMessage = result.message;
        this.pendingReview = result.status === 'pending';
        this.saving = false;
        this.form.reset({
          title: '', system: '', location: '', mode: 'Presencial', schedule: '', frequency: 'One-shot',
          seats: 2, totalSeats: 5, level: 'Principiantes bienvenidos', summary: '', tone: '',
          safety: 'Líneas y velos + tarjeta X', tags: 'Narrativa, Aventura'
        });
        this.submitted = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: error => {
        this.saving = false;
        this.saveError = error?.message || 'No pudimos enviar la partida. Probá nuevamente.';
      }
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted);
  }

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
