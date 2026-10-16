/**
 * High-Reliability Write Lock & Transaction Mutex
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Provides:
 * 1. Serialized mutation queue (mutateDb) to eliminate Lost Updates across concurrent async operations.
 * 2. Point-in-time Write-Freeze barrier for consistent multi-source backups.
 * 3. In-flight write tracking and deterministic sequential execution.
 * 
 * ARCHITECTURAL CONSTRAINT:
 * This in-process lock coordinates writes strictly within a single Node.js process memory.
 * It does NOT coordinate across separate OS processes or multiple horizontally-scaled Render instances.
 */

import { EventEmitter } from "events";
import { AsyncLocalStorage } from "async_hooks";

interface MutationContext {
  lockId: string;
  depth: number;
}

class WriteCoordinator extends EventEmitter {
  private queue: Promise<any> = Promise.resolve();
  private activeWritesCount = 0;
  private isWriteFrozen = false;
  private freezeWaiters: Array<() => void> = [];
  private pendingFrozenWrites: Array<() => boolean> = [];
  private lockStorage = new AsyncLocalStorage<MutationContext>();

  public getIsWriteFrozen(): boolean {
    return this.isWriteFrozen;
  }

  public isCurrentContextHoldingLock(): boolean {
    const store = this.lockStorage.getStore();
    return Boolean(store && store.depth > 0);
  }

  public enqueueFrozenWrite(writeOp: () => boolean): boolean {
    if (!this.isWriteFrozen) {
      return writeOp();
    }
    this.pendingFrozenWrites.push(writeOp);
    return true;
  }

  public flushFrozenWrites(): void {
    const pending = [...this.pendingFrozenWrites];
    this.pendingFrozenWrites = [];
    for (const op of pending) {
      try {
        op();
      } catch (err) {
        console.error("[WRITE LOCK] Error flushing queued frozen write:", err);
      }
    }
  }

  public recordActiveWriteStart(): void {
    this.activeWritesCount++;
  }

  public recordActiveWriteEnd(): void {
    this.activeWritesCount = Math.max(0, this.activeWritesCount - 1);
    this.emit("write_finished", this.activeWritesCount);
  }

  /**
   * Serialized mutation executor with re-entrancy deadlock protection.
   * Guarantees that each mutation receives the absolute latest database state
   * immediately before mutating, eliminating Read-Modify-Write lost updates.
   * If a backup write-freeze is in progress, incoming mutations wait until unfrozen.
   * Deadlock prevention: Re-entrant calls from the same async context run without queue deadlocks.
   */
  public async mutate<T>(
    getDb: () => any,
    saveDb: (data: any) => boolean,
    mutator: (db: any) => Promise<T> | T,
    onRollback?: () => void
  ): Promise<T> {
    const currentContext = this.lockStorage.getStore();

    // 1. RE-ENTRANCY GUARD: If caller already owns the mutation lock in this async stack, execute directly without queuing
    if (currentContext && currentContext.depth > 0) {
      const db = getDb();
      if (!db || typeof db !== "object") {
        throw new Error("Cannot mutate: database content is invalid or empty");
      }
      return await this.lockStorage.run(
        { lockId: currentContext.lockId, depth: currentContext.depth + 1 },
        async () => {
          return await mutator(db);
        }
      );
    }

    // 2. Normal serialized execution through queue:
    if (this.isWriteFrozen) {
      await new Promise<void>((resolve) => {
        this.freezeWaiters.push(resolve);
      });
    }

    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          this.recordActiveWriteStart();
          try {
            // Re-check freeze in case it was activated right before our turn
            if (this.isWriteFrozen) {
              await new Promise<void>((res) => {
                this.freezeWaiters.push(res);
              });
            }

            // 1. Fetch freshest state directly inside serialized lock
            const db = getDb();
            if (!db || typeof db !== "object") {
              throw new Error("Cannot mutate: database content is invalid or empty");
            }

            const lockId = "lock-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);

            // 2. Execute mutation within re-entrant AsyncLocalStorage context
            const result = await this.lockStorage.run(
              { lockId, depth: 1 },
              async () => {
                return await mutator(db);
              }
            );

            // 3. Stamp revision watermark
            db._version = ((typeof db._version === "number" ? db._version : 0) + 1);
            db._lastModified = new Date().toISOString();

            // 4. Atomic persist
            const saved = saveDb(db);
            if (!saved) {
              throw new Error("Failed to persist database changes during atomic write");
            }

            resolve(result);
          } catch (err) {
            if (onRollback) {
              try { onRollback(); } catch (_) {}
            }
            reject(err);
          } finally {
            this.recordActiveWriteEnd();
          }
        })
        .catch((err) => {
          console.error("[WRITE LOCK] Mutation queue caught error:", err);
        });
    });
  }

  /**
   * Guards physical attachment operations (uploads, modifications, deletions).
   * Ensures attachment modifications cannot run concurrently with backup freeze,
   * and registers attachment writes in activeWritesCount so freeze waits for them.
   */
  public async guardAttachmentOperation<T>(action: () => Promise<T> | T): Promise<T> {
    if (this.isWriteFrozen) {
      await new Promise<void>((resolve) => {
        this.freezeWaiters.push(resolve);
      });
    }

    this.recordActiveWriteStart();
    try {
      if (this.isWriteFrozen) {
        await new Promise<void>((res) => {
          this.freezeWaiters.push(res);
        });
      }
      return await action();
    } finally {
      this.recordActiveWriteEnd();
    }
  }

  /**
   * Point-in-time Write Freeze barrier for atomic multi-source backups.
   * Waits for all active in-flight writes to finish before resolving.
   * Always releases cleanly when the returned callback is called.
   */
  public async acquireWriteFreeze(timeoutMs = 5000): Promise<() => void> {
    this.isWriteFrozen = true;

    // Wait for in-flight writes to finish
    if (this.activeWritesCount > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          this.isWriteFrozen = false;
          // CRITICAL: Always release all freeze waiters if freeze acquisition times out!
          const waiters = [...this.freezeWaiters];
          this.freezeWaiters = [];
          for (const w of waiters) {
            try { w(); } catch (_) {}
          }
          reject(new Error("Timeout waiting for active writes to settle before snapshot"));
        }, timeoutMs);

        const onFinished = (remaining: number) => {
          if (remaining === 0) {
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          clearTimeout(timer);
          this.removeListener("write_finished", onFinished);
        };

        this.on("write_finished", onFinished);
      });
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.isWriteFrozen = false;
      this.flushFrozenWrites();
      const waiters = [...this.freezeWaiters];
      this.freezeWaiters = [];
      for (const w of waiters) {
        try { w(); } catch (_) {}
      }
    };
  }

  /**
   * Safe scoped write-freeze execution wrapper.
   * Automatically guarantees that freeze is released even on unhandled rejection.
   */
  public async withWriteFreeze<T>(action: () => Promise<T>, timeoutMs = 5000): Promise<T> {
    const release = await this.acquireWriteFreeze(timeoutMs);
    try {
      return await action();
    } finally {
      release();
    }
  }

  public releaseWriteFreeze(): void {
    this.isWriteFrozen = false;
    this.flushFrozenWrites();
    const waiters = [...this.freezeWaiters];
    this.freezeWaiters = [];
    for (const w of waiters) {
      try { w(); } catch (_) {}
    }
  }

  public getStatus() {
    return {
      activeWritesCount: this.activeWritesCount,
      isWriteFrozen: this.isWriteFrozen,
      freezeWaitersCount: this.freezeWaiters.length
    };
  }
}

export const writeCoordinator = new WriteCoordinator();
