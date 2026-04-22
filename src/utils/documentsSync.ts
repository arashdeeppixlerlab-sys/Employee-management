type DocumentsChangeScope = 'employee' | 'admin';

type DocumentsChangeEvent = {
  scope: DocumentsChangeScope;
  employeeId?: string;
};

type DocumentsListener = (event: DocumentsChangeEvent) => void;

const listeners = new Set<DocumentsListener>();

export const subscribeToDocumentsChanges = (listener: DocumentsListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyDocumentsChanged = (event: DocumentsChangeEvent) => {
  listeners.forEach((listener) => listener(event));
};
