import test from "node:test";
import assert from "node:assert/strict";

import {
  removeEventBanner,
  storeEventBanner,
} from "../src/services/eventBanner.service.js";

test("event banner upload stores Cloudinary URL and public id", async () => {
  let uploadedBuffer = null;
  let uploadOptions = null;
  const cloudinaryClient = {
    uploader: {
      upload_stream(options, callback) {
        uploadOptions = options;

        return {
          end(buffer) {
            uploadedBuffer = buffer;
            callback(null, {
              secure_url: "https://res.cloudinary.com/example/event-banner.jpg",
              public_id: "events/event-banners/banner_123",
            });
          },
        };
      },
    },
  };
  const file = {
    buffer: Buffer.from("image-data"),
    mimetype: "image/jpeg",
  };

  const result = await storeEventBanner(file, {
    cloudinaryClient,
    nodeEnv: "production",
  });

  assert.equal(result.url, "https://res.cloudinary.com/example/event-banner.jpg");
  assert.equal(result.publicId, "events/event-banners/banner_123");
  assert.equal(uploadedBuffer.equals(file.buffer), true);
  assert.equal(uploadOptions.folder, "events/event-banners");
  assert.equal(uploadOptions.resource_type, "image");
});

test("event banner upload reports missing production storage configuration", async () => {
  await assert.rejects(
    storeEventBanner(
      {
        buffer: Buffer.from("image-data"),
        mimetype: "image/png",
      },
      {
        cloudinaryClient: null,
        nodeEnv: "production",
      }
    ),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.message, "Banner image storage is not configured");
      return true;
    }
  );
});

test("event banner removal delegates Cloudinary cleanup", async () => {
  const calls = [];
  const cloudinaryClient = {
    uploader: {
      async destroy(publicId, options) {
        calls.push({ publicId, options });
      },
    },
  };

  const removed = await removeEventBanner("events/event-banners/banner_123", {
    cloudinaryClient,
  });

  assert.equal(removed, true);
  assert.deepEqual(calls, [
    {
      publicId: "events/event-banners/banner_123",
      options: {
        resource_type: "image",
        invalidate: true,
      },
    },
  ]);
});
