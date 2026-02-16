// ============================================================================
// Blind-Link: Contact Hash Canonicalization Tests
// ============================================================================
// CRITICAL: These tests verify that registration and discovery use identical
// normalization logic. Hash consistency is essential for matching.
// ============================================================================

import { describe, it, expect } from "vitest";
import { normalizeContact, hashContact } from "./contact-hash";

describe("Contact Canonicalization", () => {
  describe("Email normalization", () => {
    it("lowercases emails consistently", async () => {
      expect(normalizeContact("Alice@Example.COM")).toBe("alice@example.com");
      expect(normalizeContact("  alice@example.com  ")).toBe("alice@example.com");
    });

    it("trims whitespace", () => {
      expect(normalizeContact("  test@domain.com  ")).toBe("test@domain.com");
    });

    it("produces same hash for equivalent emails", async () => {
      const hash1 = await hashContact("Alice@Example.COM");
      const hash2 = await hashContact("alice@example.com");
      const hash3 = await hashContact("  ALICE@EXAMPLE.COM  ");

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe("Phone number normalization", () => {
    it("strips all non-digit characters", () => {
      expect(normalizeContact("+1 (555) 123-4567")).toBe("15551234567");
      expect(normalizeContact("1-555-123-4567")).toBe("15551234567");
      expect(normalizeContact("15551234567")).toBe("15551234567");
    });

    it("produces same hash for equivalent phones", async () => {
      const hash1 = await hashContact("+1 (555) 123-4567");
      const hash2 = await hashContact("1-555-123-4567");
      const hash3 = await hashContact("15551234567");

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe("Handle/username normalization", () => {
    it("strips leading @ and lowercases", () => {
      expect(normalizeContact("@Username")).toBe("username");
      expect(normalizeContact("username")).toBe("username");
      expect(normalizeContact("  @USERNAME  ")).toBe("username");
    });

    it("produces same hash for equivalent handles", async () => {
      const hash1 = await hashContact("@Username");
      const hash2 = await hashContact("username");
      const hash3 = await hashContact("  USERNAME  ");

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe("Hash determinism", () => {
    it("same input always produces same hash", async () => {
      const contact = "test@example.com";
      const hash1 = await hashContact(contact);
      const hash2 = await hashContact(contact);
      const hash3 = await hashContact(contact);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it("different inputs produce different hashes", async () => {
      const hash1 = await hashContact("alice@example.com");
      const hash2 = await hashContact("bob@example.com");

      expect(hash1).not.toBe(hash2);
    });

    it("hash is valid 128-bit hex string", async () => {
      const hash = await hashContact("test@example.com");

      expect(hash).toMatch(/^[0-9a-f]{32}$/);
      expect(hash.length).toBe(32);
    });
  });
});
