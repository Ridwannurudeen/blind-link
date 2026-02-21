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

  describe("Edge cases", () => {
    it("handles empty string", () => {
      expect(normalizeContact("")).toBe("");
      expect(normalizeContact("   ")).toBe("");
    });

    it("handles email with leading @ (not a handle)", () => {
      // @user@domain.com — strip leading @, still has @ → email path
      expect(normalizeContact("@user@domain.com")).toBe("user@domain.com");
    });

    it("does not treat short digit strings as phone numbers", () => {
      // Less than 7 digits → handle path, not phone
      expect(normalizeContact("123456")).toBe("123456");
      expect(normalizeContact("12345")).toBe("12345");
    });

    it("does not treat long digit strings as phone numbers", () => {
      // More than 15 digits → handle path
      expect(normalizeContact("1234567890123456")).toBe("1234567890123456");
    });

    it("handles unicode and special characters in handles", () => {
      expect(normalizeContact("@CaféUser")).toBe("caféuser");
      expect(normalizeContact("user.name")).toBe("user.name");
      expect(normalizeContact("user_name")).toBe("user_name");
    });

    it("preserves email local part special characters", () => {
      expect(normalizeContact("user+tag@gmail.com")).toBe("user+tag@gmail.com");
      expect(normalizeContact("first.last@domain.co.uk")).toBe("first.last@domain.co.uk");
    });

    it("phone with letters mixed in extracts digits only", () => {
      // "call 5551234567" has 10 digits → phone path
      expect(normalizeContact("call5551234567")).toBe("5551234567");
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
