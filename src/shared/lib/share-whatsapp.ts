import { toPng } from 'html-to-image';

/**
 * Normaliza a formato E.164 sin `+` (que es lo que espera `wa.me`).
 * Los teléfonos se guardan como los tipeó el operador — a veces con
 * espacios, guiones o sin código país. Nicaragua es +505.
 *
 * Devuelve null si el input no tiene ningún dígito.
 */
export function normalizeNiPhoneForWhatsApp(input: string | null): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return null;
  // Ya trae código país 505.
  if (digits.startsWith('505')) return digits;
  return `505${digits}`;
}

/** Detecta si el navegador puede compartir archivos vía Web Share API. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') {
    return false;
  }
  // Test file — no lo enviamos, solo verificamos si el navegador acepta files.
  try {
    const testFile = new File([''], 'test.png', { type: 'image/png' });
    return nav.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Convierte un HTMLElement a un blob PNG usando html-to-image.
 *
 * Los elementos con `data-share-hide="true"` se omiten — útil para
 * botones de acción que no deben aparecer en la imagen capturada.
 */
export async function elementToPngBlob(el: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
    filter: (node) => {
      if (node instanceof HTMLElement) {
        return node.dataset.shareHide !== 'true';
      }
      return true;
    },
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

interface ShareCardOptions {
  /** Elemento DOM a capturar como imagen. */
  element: HTMLElement;
  /** Teléfono destino (crudo — se normaliza acá). */
  phone: string | null;
  /** Texto acompañante del share. Aparece en el chat de WhatsApp. */
  message: string;
  /** Nombre sugerido del archivo si se usa el fallback de descarga. */
  fileName: string;
}

export interface ShareCardResult {
  ok: boolean;
  /** `native` = Web Share API; `fallback` = descarga + wa.me chat. */
  mode: 'native' | 'fallback';
  /** Motivo cuando `ok=false` (ej. sin teléfono, sin permiso). */
  reason?: 'no_phone' | 'cancelled' | 'error';
}

/**
 * Comparte un card como imagen por WhatsApp.
 *
 * - En móvil (Web Share API): envía la imagen + texto directamente. El
 *   usuario elige el chat en el picker nativo — con teléfono conocido o
 *   sin él, WhatsApp lista todos los contactos y el operador escoge.
 * - Fallback (desktop / navegadores sin file share): descarga el PNG.
 *   Si además hay teléfono conocido, abre `wa.me/<phone>` con el texto
 *   pre-cargado para agilizar. Si no hay teléfono, solo descarga —
 *   el operador comparte manualmente desde WhatsApp Desktop / Web.
 *
 * Antes se bloqueaba el share cuando faltaba el teléfono, lo que
 * dejaba a encargados/vendedores sin número configurado sin forma de
 * recibir su reporte. La captura de la imagen NO depende del número:
 * el share nativo funciona igual, y en desktop la descarga alcanza.
 */
export async function shareCardImage(
  opts: ShareCardOptions,
): Promise<ShareCardResult> {
  const phone = normalizeNiPhoneForWhatsApp(opts.phone);

  let blob: Blob;
  try {
    blob = await elementToPngBlob(opts.element);
  } catch {
    return { ok: false, mode: 'native', reason: 'error' };
  }

  const file = new File([blob], opts.fileName, { type: 'image/png' });

  if (canShareFiles()) {
    try {
      await navigator.share({
        files: [file],
        text: opts.message,
      });
      return { ok: true, mode: 'native' };
    } catch (err) {
      // AbortError = el usuario canceló el picker; no es un error real.
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, mode: 'native', reason: 'cancelled' };
      }
      // Si el share nativo falla por otra razón, caemos al fallback.
    }
  }

  // Fallback: descargar la imagen. Si hay teléfono, además abrimos el
  // chat de WhatsApp con el texto pre-cargado; sin teléfono, el usuario
  // arrastra la imagen al chat que elija manualmente.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Damos un tick para que la descarga se dispare antes de abrir la pestaña,
  // que en algunos navegadores puede bloquear el click original.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  if (phone) {
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(opts.message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  return { ok: true, mode: 'fallback' };
}
