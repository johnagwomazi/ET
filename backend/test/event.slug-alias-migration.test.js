import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPTY_SLUG_ALIASES_FILTER,
  migrateEmptyEventSlugAliases,
} from "../scripts/migrate-empty-event-slug-aliases.js";

test("empty slug alias migration unsets only empty arrays", async () => {
  const calls = [];
  const collection = {
    async countDocuments(filter) {
      calls.push({ method: "countDocuments", filter });
      return 2;
    },
    async updateMany(filter, update) {
      calls.push({ method: "updateMany", filter, update });
      return { modifiedCount: 2 };
    },
  };

  const report = await migrateEmptyEventSlugAliases({ apply: true, collection });

  assert.deepEqual(report, { apply: true, matched: 2, modified: 2 });
  assert.deepEqual(calls, [
    { method: "countDocuments", filter: EMPTY_SLUG_ALIASES_FILTER },
    {
      method: "updateMany",
      filter: EMPTY_SLUG_ALIASES_FILTER,
      update: { $unset: { slugAliases: "" } },
    },
  ]);
});

test("empty slug alias migration dry run does not update data", async () => {
  let updateCalled = false;
  const collection = {
    async countDocuments() { return 1; },
    async updateMany() { updateCalled = true; return { modifiedCount: 1 }; },
  };

  const report = await migrateEmptyEventSlugAliases({ collection });

  assert.deepEqual(report, { apply: false, matched: 1, modified: 0 });
  assert.equal(updateCalled, false);
});
