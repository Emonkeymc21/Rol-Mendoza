import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type LegalDocument = 'privacy' | 'terms';

@Component({
  selector: 'app-legal',
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.scss']
})
export class LegalComponent {
  readonly document: LegalDocument;

  constructor(route: ActivatedRoute) {
    this.document = route.snapshot.data['legalDocument'] === 'terms' ? 'terms' : 'privacy';
  }
}
