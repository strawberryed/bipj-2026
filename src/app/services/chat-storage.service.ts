import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  Firestore, collection, doc, getDocs, query,
  orderBy, limit, writeBatch, Timestamp
} from '@angular/fire/firestore';
import { Message } from './gemini.service';

@Injectable({ providedIn: 'root' })
export class ChatStorageService {

  constructor(
    private firestore: Firestore,
    private injector: EnvironmentInjector
  ) { }

  async loadChat(uid: string | null, maxMessages = 50): Promise<Message[]> {
    if (!uid) return [];

    return runInInjectionContext(this.injector, async () => {
      try {
        const historyRef = collection(this.firestore, 'users', uid, 'chatHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(maxMessages));
        const snap = await getDocs(q);

        return snap.docs
          .map(d => this.docToMessage(d.data()))
          .reverse();
      } catch (err) {
        console.error('[ChatStorageService] loadChat failed:', err);
        return [];
      }
    });
  }

  async appendMessage(uid: string | null, message: Message): Promise<void> {
    if (!uid) return;

    return runInInjectionContext(this.injector, async () => {
      try {
        const historyRef = collection(this.firestore, 'users', uid, 'chatHistory');
        const messageDocRef = doc(historyRef);
        const batch = writeBatch(this.firestore);
        batch.set(messageDocRef, this.messageToDoc(message));
        await batch.commit();
      } catch (err) {
        console.error('[ChatStorageService] appendMessage failed:', err);
      }
    });
  }

  async clearChat(uid: string | null): Promise<void> {
    if (!uid) return;

    return runInInjectionContext(this.injector, async () => {
      try {
        const historyRef = collection(this.firestore, 'users', uid, 'chatHistory');
        const snap = await getDocs(historyRef);
        if (snap.empty) return;

        const batch = writeBatch(this.firestore);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error('[ChatStorageService] clearChat failed:', err);
      }
    });
  }

  private messageToDoc(msg: Message): any {
    const docObj: any = {
      role: msg.role,
      content: msg.content ?? '',
      createdAt: Timestamp.now()
    };
    if (msg.blocks) docObj.blocks = msg.blocks;
    if (msg.compareCard) docObj.compareCard = msg.compareCard;
    if (msg.followUpQuestion) docObj.followUpQuestion = msg.followUpQuestion;
    if (msg.attachment) docObj.attachment = msg.attachment;
    return docObj;
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
    if (data.createdAt instanceof Timestamp) {
      msg.timestamp = data.createdAt.toDate();
    }
    return msg;
  }
}