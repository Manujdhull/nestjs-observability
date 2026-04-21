import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  correlationId: string;
  [key: string]: any;
}

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  static run<R>(data: RequestContextData, callback: () => R): R {
    return this.storage.run(data, callback);
  }

  static get<T extends keyof RequestContextData>(key: T): RequestContextData[T] | undefined {
    const store = this.storage.getStore();
    return store ? store[key] : undefined;
  }

  static getCorrelationId(): string | undefined {
    return this.get('correlationId');
  }
}
