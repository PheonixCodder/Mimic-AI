const MIN_AVATAR_DIMENSION = 256;

export function getImageDimensions(
  buffer: Buffer,
  contentType: string,
): { width: number; height: number } | null {
  if (contentType === "image/png") {
    if (buffer.length < 24) {
      return null;
    }

    const signature = buffer.readUInt32BE(0);
    if (signature !== 0x89504e47) {
      return null;
    }

    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (contentType === "image/jpeg" || contentType === "image/jpg") {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      return null;
    }

    let offset = 2;

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        return null;
      }

      const marker = buffer[offset + 1];
      const blockLength = buffer.readUInt16BE(offset + 2);

      if (
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }

      offset += 2 + blockLength;
    }

    return null;
  }

  if (contentType === "image/webp") {
    if (buffer.length < 30) {
      return null;
    }

    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);

    if (riff !== "RIFF" || webp !== "WEBP") {
      return null;
    }

    const chunk = buffer.toString("ascii", 12, 16);

    if (chunk === "VP8 ") {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }

    if (chunk === "VP8L") {
      const bits =
        buffer[21] |
        (buffer[22] << 8) |
        (buffer[23] << 16) |
        (buffer[24] << 24);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    if (chunk === "VP8X") {
      const width =
        1 +
        buffer[24] +
        (buffer[25] << 8) +
        (buffer[26] << 16);
      const height =
        1 +
        buffer[27] +
        (buffer[28] << 8) +
        (buffer[29] << 16);
      return { width, height };
    }
  }

  return null;
}

export function validateMinImageDimensions(
  buffer: Buffer,
  contentType: string,
  minSize = MIN_AVATAR_DIMENSION,
): { ok: true } | { ok: false; message: string } {
  const dimensions = getImageDimensions(buffer, contentType);

  if (!dimensions) {
    return {
      ok: false,
      message: "Could not read image dimensions",
    };
  }

  if (dimensions.width < minSize || dimensions.height < minSize) {
    return {
      ok: false,
      message: `Image must be at least ${minSize}×${minSize}px (got ${dimensions.width}×${dimensions.height}px)`,
    };
  }

  return { ok: true };
}
