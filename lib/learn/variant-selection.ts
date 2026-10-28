type Result = { error?: string };
type Snapshot = { flags: boolean[]; pending: number; error: string | null };
// Serialize read/modify/write actions so rapid selections cannot overwrite each other.
export class VariantSelection {
  private confirmed: boolean[];
  private snapshot: Snapshot;
  private tail: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(flags: boolean[], private save: (index: number, enabled: boolean) => Promise<Result>, private settled: () => void) {
    this.confirmed = [...flags]; this.snapshot = { flags: [...flags], pending: 0, error: null };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(snapshot: Snapshot) { this.snapshot = snapshot; for (const listener of this.listeners) listener(); }
  reset(flags: boolean[]) { if (!this.snapshot.pending) { this.confirmed = [...flags]; this.emit({ flags: [...flags], pending: 0, error: null }); } }
  toggle(index: number, enabled: boolean) {
    const flags = [...this.snapshot.flags]; flags[index] = enabled;
    this.emit({ flags, pending: this.snapshot.pending + 1, error: this.snapshot.pending ? this.snapshot.error : null });
    this.tail = this.tail.then(async () => {
      let error = this.snapshot.error;
      try { const result = await this.save(index, enabled); if (result.error) error = result.error; else this.confirmed[index] = enabled; }
      catch { error = '변형 선택을 저장하지 못했습니다. 다시 선택해 주세요.'; }
      const pending = this.snapshot.pending - 1;
      this.emit({ flags: pending ? this.snapshot.flags : [...this.confirmed], pending, error });
      if (!pending) this.settled();
    });
    return this.tail;
  }
}
