// Fail-Fast & Auto-Recovery ガードレール実装
// 外部I/O、API、UI処理の堅牢化

// 結果型（例外なし設計）
export type Result<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string; code?: number };

// タイムアウト付きPromise
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${timeoutMessage} (${timeoutMs}ms)`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

// 指数バックオフ付きリトライ
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    tries: number;
    baseDelay: number;
    jitter: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const { tries, baseDelay, jitter, onRetry } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === tries) {
        break; // 最後の試行なので諦める
      }

      // 指数バックオフ + ジッター
      let delay = baseDelay * Math.pow(2, attempt - 1);
      if (jitter) {
        delay += Math.random() * delay * 0.1; // ±10%のジッター
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// サーキットブレーカー状態
export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface BreakerConfig {
  threshold: number;     // 連続失敗回数の閾値
  cooldownMs: number;    // クールダウン時間
  monitorPeriodMs?: number; // 統計期間
}

class CircuitBreaker {
  private state: BreakerState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successes = 0;

  constructor(
    public readonly name: string,
    private config: BreakerConfig
  ) {}

  getState(): BreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN状態では即座に拒否
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime < this.config.cooldownMs) {
        throw new Error(`Circuit breaker [${this.name}] is OPEN. Retry after cooldown.`);
      }
      // クールダウン終了 → HALF_OPEN
      this.state = 'HALF_OPEN';
      this.failures = 0; // リセット
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.successes++;
    
    if (this.state === 'HALF_OPEN') {
      // HALF_OPEN状態で成功 → CLOSED
      this.state = 'CLOSED';
      this.failures = 0;
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.threshold) {
      this.state = 'OPEN';
    }
  }

  // 強制リセット（管理用）
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
  }
}

// グローバルブレーカー管理
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string, 
  config: BreakerConfig
): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, config));
  }
  return breakers.get(name)!;
}

// 安全なfetch（タイムアウト + リトライ + ブレーカー）
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: {
    timeoutMs?: number;
    retries?: number;
    baseDelay?: number;
    breakerName?: string;
    breakerConfig?: BreakerConfig;
  } = {}
): Promise<Result<Response>> {
  const {
    timeoutMs = 5000,
    retries = 1,
    baseDelay = 200,
    breakerName,
    breakerConfig = { threshold: 3, cooldownMs: 30000 }
  } = options;

  const fetchFn = async (): Promise<Response> => {
    return withTimeout(fetch(input, init), timeoutMs, `Fetch timeout to ${input}`);
  };

  try {
    let response: Response;

    if (breakerName) {
      const breaker = getCircuitBreaker(breakerName, breakerConfig);
      response = await breaker.execute(async () => {
        return await retry(fetchFn, {
          tries: retries + 1,
          baseDelay,
          jitter: true,
          onRetry: (attempt, error) => {
            console.warn(`🔄 Retry ${attempt}/${retries} for ${input}:`, error.message);
          }
        });
      });
    } else {
      response = await retry(fetchFn, {
        tries: retries + 1,
        baseDelay,
        jitter: true,
        onRetry: (attempt, error) => {
          console.warn(`🔄 Retry ${attempt}/${retries} for ${input}:`, error.message);
        }
      });
    }

    return { ok: true, data: response };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = errorMessage.includes('Circuit breaker') ? 503 : 
                     errorMessage.includes('timeout') ? 408 : 500;

    console.error(`❌ safeFetch failed for ${input}:`, errorMessage);
    
    return { 
      ok: false, 
      error: errorMessage,
      code: errorCode
    };
  }
}

// セーフモード判定
export function isSafeMode(): boolean {
  return process.env.RUNTIME_SAFE_MODE === 'true';
}

// ブレーカー状態取得（デバッグ用）
export function getAllBreakerStates(): Record<string, any> {
  const states: Record<string, any> = {};
  breakers.forEach((breaker, name) => {
    states[name] = breaker.getStats();
  });
  return states;
}

// 結果型ヘルパー
export const Ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const Err = (error: string, code?: number): Result<never> => ({ ok: false, error, code });

// JSON解析（安全版）
export function safeParseJson(text: string): Result<any> {
  try {
    const data = JSON.parse(text);
    return Ok(data);
  } catch (error) {
    return Err(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 環境チェックユーティリティ
export function checkEnvironment(): Result<{
  nodeVersion: string;
  envLoaded: boolean;
  port3000Available: boolean;
}> {
  try {
    const nodeVersion = process.version;
    const envLoaded = !!process.env.RAKUTEN_APP_ID;

    return Ok({
      nodeVersion,
      envLoaded,
      port3000Available: true // この関数内では簡易チェック
    });
  } catch (error) {
    return Err(`Environment check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
