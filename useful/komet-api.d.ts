declare module 'komet:api' {
  export type JsonPrimitive = string | number | boolean | null;
  export type JsonValue =
    | JsonPrimitive
    | JsonValue[]
    | { [key: string]: JsonValue };

  export interface ReplyAttachment {
    type: string;
  }

  export interface ReplyMessage {
    id: string;
    senderId: number;
    text: string | null;
    time: number;
    attachments: ReplyAttachment[];
  }

  export interface CommandContext<
    Arguments extends Record<string, string> = Record<string, string>
  > {
    args: string;
    arguments: Arguments;
    reply: ReplyMessage | null;
    apiVersion: number;
  }

  export interface PhotoOptions {
    url?: string;
    base64?: string;
    filename?: string;
    caption?: string;
  }

  export interface FileOptions {
    url?: string;
    base64?: string;
    filename?: string;
  }

  export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  export interface FetchOptions {
    method?: HttpMethod;
    headers?: Record<string, string | number | boolean>;
    body?: unknown;
  }

  export interface FetchResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
    base64: string;
  }

  export interface Peer {
    id: number;
    displayName: string | null;
    country: string | null;
    registrationTime: number | null;
    updateTime: number | null;
    options: string[];
  }

  export const chat: Readonly<{
    sendText(text: string): Promise<string>;
    editText(messageId: string, text: string): Promise<void>;
    sendPhoto(options: PhotoOptions): Promise<void>;
    sendFile(options: FileOptions): Promise<void>;
  }>;

  export const network: Readonly<{
    fetch(url: string, options?: FetchOptions): Promise<FetchResponse>;
  }>;

  export const ui: Readonly<{
    notify(message: string): Promise<void>;
  }>;

  export const contact: Readonly<{
    getPeer(): Promise<Peer | null>;
  }>;

  export const runtime: Readonly<{
    sleep(milliseconds: number): Promise<void>;
    isOnline(): Promise<boolean>;
    isActive(): Promise<boolean>;
  }>;

  export const storage: Readonly<{
    get(key: string): Promise<unknown>;
    set(key: string, value: JsonValue): Promise<void>;
    remove(key: string): Promise<void>;
  }>;
}
