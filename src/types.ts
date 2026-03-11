export interface UserProfile {
  uid: string;
  displayName: string;
  shortId: string;
  photoURL?: string;
  createdAt: any;
}

export interface ChatMetadata {
  chatId: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: any;
  otherUser?: UserProfile; // Populated client-side
}

export interface Message {
  messageId: string;
  chatId: string;
  senderId: string;
  encryptedContent: string;
  timestamp: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface Call {
  callId: string;
  callerId: string;
  receiverId: string;
  status: 'offering' | 'answering' | 'active' | 'ended' | 'rejected';
  type: 'audio' | 'video';
  offer?: any;
  answer?: any;
  createdAt: any;
}

export interface IceCandidate {
  candidate: any;
  senderId: string;
  timestamp: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
