import { Transform } from "stream";

/**
 * Cria um Transform stream do Node.js para limitar a taxa de transferência (bandwidth throttling).
 * A taxa é configurada via DOWNLOAD_THROTTLE_MBPS (padrão: 10 MB/s por conexão).
 * Se configurado para 0 ou vazio, o throttling é desativado.
 */
export function createBandwidthThrottler(): Transform | null {
  const envVal = process.env.DOWNLOAD_THROTTLE_MBPS;
  const mbps = envVal !== undefined && envVal !== "" ? parseFloat(envVal) : 10; // Padrão 10 MB/s

  if (isNaN(mbps) || mbps <= 0) {
    return null; // Sem throttling
  }

  const bytesPerSecond = mbps * 1024 * 1024;
  let lastChunkTime = Date.now();

  return new Transform({
    transform(chunk, encoding, callback) {
      const chunkSize = chunk.length;
      const expectedTimeMs = (chunkSize / bytesPerSecond) * 1000;
      const now = Date.now();
      const timeSinceLast = now - lastChunkTime;
      const waitTime = Math.max(0, expectedTimeMs - timeSinceLast);

      if (waitTime > 2) {
        setTimeout(() => {
          lastChunkTime = Date.now();
          callback(null, chunk);
        }, waitTime);
      } else {
        lastChunkTime = now;
        callback(null, chunk);
      }
    },
  });
}
