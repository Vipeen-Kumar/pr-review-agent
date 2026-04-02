import readline from "node:readline";
import { reviewPR } from "./gemini.js";

const samplePR = `
- function multiply(a, b) {
-   return a + b;
- }

+ function multiply(a, b) {
+   return a * b;
+ }
`;

async function runReview(input) {
  console.log("\nReviewing PR...\n");
  const result = await reviewPR(input);
  console.log(result);
}

async function main() {
  if (process.argv.includes("--sample")) {
    await runReview(samplePR);
    return;
  }

  if (!process.stdin.isTTY) {
    const chunks = [];

    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    await runReview(chunks.join(""));
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Paste your PR diff below. Type "END" on its own line when finished.\n');

  const lines = [];

  rl.on("line", (line) => {
    if (line === "END") {
      rl.close();
      return;
    }

    lines.push(line);
  });

  rl.on("close", async () => {
    try {
      await runReview(lines.join("\n"));
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exitCode = 1;
    }
  });
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
