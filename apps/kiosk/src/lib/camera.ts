export async function getCameraStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false,
  });
}

export function captureFromVideo(
  videoEl: HTMLVideoElement,
  opts?: { maxW?: number; jpegQuality?: number }
): string {
  const maxW = opts?.maxW ?? 720;
  const jpegQuality = opts?.jpegQuality ?? 0.75;

  const vw = videoEl.videoWidth || 1280;
  const vh = videoEl.videoHeight || 720;

  const scale = Math.min(1, maxW / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(videoEl, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", jpegQuality);
}
