/**
 * Lectura mínima de JWTs en el cliente. NO valida la firma — eso es
 * responsabilidad del backend. Solo nos interesa `exp` para saber si vale
 * la pena mandar el token o si conviene refrescarlo antes de salir.
 *
 * Decodificamos a mano (base64url) para no sumar una dependencia por tres
 * líneas.
 */

/**
 * Margen con el que damos por vencido un token que todavía no vence.
 * Cubre dos cosas: el reloj del cliente puede estar corrido respecto al
 * servidor, y un token que expira en 30s va a morir a mitad de la próxima
 * pantalla.
 */
export const TOKEN_EXPIRY_SKEW_MS = 60_000;

interface JwtPayload {
  exp?: number;
  sub?: string;
}

function decodePayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/** Epoch en ms del `exp` del token, o null si no se puede leer. */
export function getTokenExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodePayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
}

/**
 * True si el token ya venció, o vence dentro de `skewMs`.
 *
 * El margen existe para dos cosas: el reloj del cliente puede estar
 * corrido respecto al servidor, y un token que vence en 20 segundos va a
 * morir a mitad de la próxima pantalla. Mejor refrescarlo antes.
 *
 * Un token ilegible cuenta como vencido: si no podemos leerlo, el backend
 * tampoco lo va a aceptar.
 */
export function isTokenExpired(
  token: string | null | undefined,
  skewMs = TOKEN_EXPIRY_SKEW_MS,
): boolean {
  const expiry = getTokenExpiry(token);
  if (expiry === null) return true;
  return Date.now() >= expiry - skewMs;
}
