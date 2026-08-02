import assert from "node:assert/strict";
import test from "node:test";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
} from "../app/chatgpt-auth-paths.ts";

test("ChatGPT authentication paths preserve safe relative return locations", () => {
  assert.equal(
    chatGPTSignInPath("/dashboard?marketplace=Amazon#picks"),
    "/signin-with-chatgpt?return_to=%2Fdashboard%3Fmarketplace%3DAmazon%23picks",
  );
  assert.equal(
    chatGPTSignOutPath("/products"),
    "/signout-with-chatgpt?return_to=%2Fproducts",
  );
});

test("ChatGPT authentication paths reject external and reserved returns", () => {
  for (const unsafeReturnTo of [
    "https://example.com",
    "//example.com",
    "/signin-with-chatgpt",
    "/signout-with-chatgpt?return_to=/dashboard",
    "/callback",
  ]) {
    assert.equal(
      chatGPTSignInPath(unsafeReturnTo),
      "/signin-with-chatgpt?return_to=%2F",
    );
  }
});

test("ChatGPT sign-out defaults to the home page", () => {
  assert.equal(chatGPTSignOutPath(), "/signout-with-chatgpt?return_to=%2F");
});
