import { Injectable } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, deleteDoc, getDocs, query,
  orderBy, limit, writeBatch, Timestamp
} from '@angular/fire/firestore';
import { Message } from './gemini.service';

/**
 * Per-user chat history stored in Firestore as a subcollection:
 *   users/{uid}/chatHistory/{messageId}
 *
 * Each message is its own document — appended one at a time on send,
 * rather than rewriting a giant array. This scales cleanly with long
 * conversations and matches the users/{uid} shape teammate already
 * established in user-profile.service.ts.
 *
 * Chat history is scoped to the currently authenticated user's UID.
 * If no one is logged in, saves/loads are no-ops (fail silently) —
 * the chatbot page decides how to handle the unauthenticated case.
 */
@Injectable({ providedIn: 'root' })
export class ChatStorageService {

  constructor(private firestore: Firestore) { }

  /**
   * Loads the user's most recent messages from Firestore, ordered oldest-first
   * for display. Caps at `maxMessages` to avoid huge fetches on very long histories.
   */
  async loadChat(uid: string | null, maxMessages = 50): Promise<Message[]> {
    if (!uid) return [];

    try {
      const historyRef = collection(this.firestore, `users/${uid}/chatHistory`);
      const q = query(historyRef, orderBy('createdAt', 'desc'), limit(maxMessages));
      const snap = await getDocs(q);

      // Firestore returned newest first; reverse for chronological display order.
      return snap.docs
        .map(d => this.docToMessage(d.data()))
        .reverse();
    } catch (err) {
      console.error('[ChatStorageService] loadChat failed:', err);
      return [];
    }
  }

  /**
   * Appends a single new message to the user's chat history.
   * `createdAt` is set server-side via Timestamp.now() so ordering is
   * consistent regardless of client clock drift.
   */
  async appendMessage(uid: string | null, message: Message): Promise<void> {
    if (!uid) return;

    try {
      const historyRef = collection(this.firestore, `users/${uid}/chatHistory`);
      await addDoc(historyRef, this.messageToDoc(message));
    } catch (err) {
      console.error('[ChatStorageService] appendMessage failed:', err);
    }
  }

  /**
   * Deletes all chat history for the user. Uses a batched delete for efficiency
   * — for demo-scale histories (dozens of messages), a single batch is enough.
   */
  async clearChat(uid: string | null): Promise<void> {
    if (!uid) return;

    try {
      const historyRef = collection(this.firestore, `users/${uid}/chatHistory`);
      const snap = await getDocs(historyRef);
      if (snap.empty) return;

      const batch = writeBatch(this.firestore);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error('[ChatStorageService] clearChat failed:', err);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Internal serialization — strips undefined fields (Firestore rejects them)
  // and adds server timestamp.
  // ─────────────────────────────────────────────────────────

  private messageToDoc(msg: Message): any {
    const doc: any = {
      role: msg.role,
      content: msg.content ?? '',
      createdAt: Timestamp.now()
    };
    if (msg.blocks) doc.blocks = msg.blocks;
    if (msg.compareCard) doc.compareCard = msg.compareCard;
    if (msg.followUpQuestion) doc.followUpQuestion = msg.followUpQuestion;
    if (msg.attachment) doc.attachment = msg.attachment;
    if (msg.reasoning) doc.reasoning = msg.reasoning;
    return doc;
  }

  private docToMessage(data: any): Message {
    const msg: Message = {
      role: data.role,
      content: data.content ?? ''
    };
    if (data.blocks) msg.blocks = data.blocks;
    if (data.compareCard) msg.compareCard = data.compareCard;
    if (data.followUpQuestion) msg.followUpQuestion = data.followUpQuestion;
    if (data.attachment) msg.attachment = data.attachment;
    if (data.reasoning) msg.reasoning = data.reasoning;
    return msg;
  }
}