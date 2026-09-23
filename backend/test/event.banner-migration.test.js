import test from "node:test";
import assert from "node:assert/strict";

import {
  getImageMimeType,
  getLegacyBannerFileName,
  isCloudinaryUrl,
} from "../scripts/migrate-event-banners-to-cloudinary.js";

test("identifies Cloudinary banner URLs", () => {
  assert.equal(isCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/banner.jpg"), true);
  assert.equal(isCloudinaryUrl("https://event-mgnt-backend.onrender.com/uploads/event-banners/banner.jpg"), false);
});

test("extracts safe legacy filenames", () => {
  assert.equal(
    getLegacyBannerFileName({ url: "https://api.example.com/uploads/event-banners/banner.jpg" }),
    "banner.jpg"
  );
  assert.equal(getLegacyBannerFileName({ publicId: "local:event-banners/banner.webp" }), "banner.webp");
  assert.equal(getLegacyBannerFileName({ publicId: "local:event-banners/../secret" }), "");
});

test("recognizes accepted image signatures", () => {
  assert.equal(getImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])), "image/jpeg");
  assert.equal(
    getImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])),
    "image/png"
  );
  assert.equal(getImageMimeType(Buffer.from("RIFFxxxxWEBP")), "image/webp");
  assert.equal(getImageMimeType(Buffer.from("not-an-image")), "");
});
