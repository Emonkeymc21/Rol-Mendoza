export interface AccountSyncPayload {
  displayName: string;
}

export interface AccountSyncResult {
  uid: string;
  status: 'created' | 'updated';
  message: string;
}
