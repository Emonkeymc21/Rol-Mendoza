import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ChatConversation, ChatMessage, ChatUser } from '../../core/models/chat.model';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { CommunityService } from '../../core/services/community.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnDestroy, AfterViewChecked {
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;

  users: ChatUser[] = [];
  conversations: ChatConversation[] = [];
  messages: ChatMessage[] = [];
  activeConversation?: ChatConversation;
  loadingUsers = true;
  loadingConversations = true;
  loadingMessages = false;
  startingChatId = '';
  sending = false;
  errorMessage = '';
  private activeId = '';
  private shouldScroll = false;
  private messagesSubscription?: Subscription;
  private readonly subscriptions = new Subscription();

  readonly searchControl = this.fb.nonNullable.control('');
  readonly messageForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(1000)]]
  });

  constructor(
    private fb: FormBuilder,
    private chat: ChatService,
    private community: CommunityService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const requestedSearch = route.snapshot.queryParamMap.get('q') || '';
    this.searchControl.setValue(requestedSearch);

    this.subscriptions.add(this.chat.listenUsers().subscribe({
      next: users => { this.users = users; this.loadingUsers = false; },
      error: error => { this.loadingUsers = false; this.errorMessage = this.chat.friendlyError(error); }
    }));

    this.subscriptions.add(this.chat.listenConversations().subscribe({
      next: conversations => {
        this.conversations = conversations;
        this.loadingConversations = false;
        this.syncActiveConversation();
      },
      error: error => { this.loadingConversations = false; this.errorMessage = this.chat.friendlyError(error); }
    }));

    this.subscriptions.add(this.route.paramMap.subscribe(params => {
      this.selectConversation(params.get('id') || '');
    }));

    const gameId = route.snapshot.queryParamMap.get('gameId');
    if (gameId) void this.startGameConversation(gameId);
  }

  get currentUserUid(): string { return this.auth.currentUser?.uid || ''; }

  get filteredUsers(): ChatUser[] {
    const term = this.normalize(this.searchControl.value);
    return this.users
      .filter(user => !term || this.normalize(user.displayName).includes(term))
      .slice(0, 30);
  }

  async startConversation(user: ChatUser): Promise<void> {
    this.startingChatId = user.uid;
    this.errorMessage = '';
    try {
      const id = await this.chat.ensureDirectConversation(user);
      await this.router.navigate(['/mensajes', id]);
    } catch (error) {
      this.errorMessage = this.chat.friendlyError(error);
    } finally {
      this.startingChatId = '';
    }
  }

  private async startGameConversation(gameId: string): Promise<void> {
    this.errorMessage = '';
    try {
      const target = await firstValueFrom(this.community.getGameChatTarget(gameId));
      if (target.isOwner) {
        this.errorMessage = 'Esta partida fue creada por tu cuenta.';
        return;
      }
      const id = await this.chat.ensureDirectConversation(
        { uid: target.uid, displayName: target.displayName, photoURL: target.photoURL },
        { id: target.gameId, title: target.gameTitle }
      );
      await this.router.navigate(['/mensajes', id], { replaceUrl: true });
    } catch (error) {
      this.errorMessage = this.chat.friendlyError(error);
    }
  }

  async send(): Promise<void> {
    if (!this.activeId || this.messageForm.invalid || this.sending) {
      this.messageForm.markAllAsTouched();
      return;
    }
    const text = this.messageForm.controls.message.value;
    this.sending = true;
    this.errorMessage = '';
    try {
      await this.chat.sendMessage(this.activeId, text);
      this.messageForm.reset({ message: '' });
      this.shouldScroll = true;
    } catch (error) {
      this.errorMessage = this.chat.friendlyError(error);
    } finally {
      this.sending = false;
    }
  }

  sendOnEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    void this.send();
  }

  openConversation(conversation: ChatConversation): void {
    void this.router.navigate(['/mensajes', conversation.id]);
  }

  backToList(): void {
    void this.router.navigate(['/mensajes']);
  }

  peerId(conversation: ChatConversation): string {
    return conversation.participants.find(id => id !== this.currentUserUid) || '';
  }

  peerName(conversation: ChatConversation): string {
    const id = this.peerId(conversation);
    return conversation.participantNames?.[id] || 'Aventurero/a';
  }

  peerPhoto(conversation: ChatConversation): string {
    const id = this.peerId(conversation);
    return conversation.participantPhotos?.[id] || '';
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'RM';
  }

  toDate(value: unknown): Date | null {
    const timestamp = value as { toDate?: () => Date } | null;
    return timestamp && typeof timestamp.toDate === 'function' ? timestamp.toDate() : null;
  }

  trackById(_index: number, item: { id?: string; uid?: string }): string {
    return item.id || item.uid || String(_index);
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll || !this.messageList) return;
    this.shouldScroll = false;
    const element = this.messageList.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  private selectConversation(id: string): void {
    if (id === this.activeId) return;
    this.activeId = id;
    this.messages = [];
    this.messagesSubscription?.unsubscribe();
    this.syncActiveConversation();
    if (!id) return;

    this.loadingMessages = true;
    this.messagesSubscription = this.chat.listenMessages(id).subscribe({
      next: messages => {
        this.messages = messages;
        this.loadingMessages = false;
        this.shouldScroll = true;
      },
      error: error => {
        this.loadingMessages = false;
        this.errorMessage = this.chat.friendlyError(error);
      }
    });
  }

  private syncActiveConversation(): void {
    this.activeConversation = this.activeId
      ? this.conversations.find(conversation => conversation.id === this.activeId)
      : undefined;
  }

  private normalize(value: string): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
