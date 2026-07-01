export function getDeviceLabel(): string {
  const ua = navigator.userAgent

  const os =
    /Windows/i.test(ua)
      ? "Windows"
      : /Mac OS X|Macintosh/i.test(ua)
        ? "macOS"
        : /Android/i.test(ua)
          ? "Android"
          : /iPhone|iPad|iPod/i.test(ua)
            ? "iOS"
            : /Linux/i.test(ua)
              ? "Linux"
              : "Unknown OS"

  const browser =
    /Edg\//i.test(ua)
      ? "Edge"
      : /OPR\/|Opera/i.test(ua)
        ? "Opera"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Chrome\//i.test(ua)
            ? "Chrome"
            : /Safari\//i.test(ua)
              ? "Safari"
              : "Browser"

  return `${browser} - ${os}`
}
