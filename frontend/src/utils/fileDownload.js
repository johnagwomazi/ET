function getHeaderValue(headers, name) {
  if (!headers) {
    return "";
  }

  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase()) || "";
  }

  return headers[name] || headers[name.toLowerCase()] || "";
}

export function getFilenameFromContentDisposition(contentDisposition, fallbackName = "download") {
  if (typeof contentDisposition !== "string" || !contentDisposition.trim()) {
    return fallbackName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    } catch (error) {
      return utf8Match[1].replace(/["']/g, "") || fallbackName;
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  if (plainMatch?.[1]) {
    return plainMatch[1].replace(/["']/g, "") || fallbackName;
  }

  return fallbackName;
}

export function getDownloadFilename(headers, fallbackName = "download") {
  const contentDisposition = getHeaderValue(headers, "content-disposition");

  return getFilenameFromContentDisposition(contentDisposition, fallbackName);
}

export function downloadBlob(blob, filename) {
  if (typeof window === "undefined" || !blob) {
    return;
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename || "download";
  link.rel = "noreferrer";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 0);
}

export function downloadResponseBlob(response, fallbackName = "download") {
  const blob = response?.body || response;
  const filename = getDownloadFilename(response?.headers, fallbackName);

  downloadBlob(blob, filename);

  return filename;
}
