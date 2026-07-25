import { createServer } from "node:http";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

import * as authController from "./controllers/authController.js";
import * as reviewController from "./controllers/reviewController.js";
import * as githubController from "./controllers/githubController.js";
import * as pageController from "./controllers/pageController.js";

const port = Number(process.env.PORT || 3000);

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/api/me") {
    await authController.getMe(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/signup") {
    await authController.signup(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    await authController.login(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    authController.logout(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/review") {
    await reviewController.generateReview(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/github/fetch-pr") {
    await githubController.fetchPullRequest(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/auth/google/start") {
    authController.googleStart(response);
    return;
  }

  if (request.method === "GET" && pathname === "/auth/auth0/callback") {
    await authController.googleCallback(request, response, url);
    return;
  }

  if (request.method === "GET") {
    await pageController.serveStaticFile(pathname, response);
    return;
  }

  response.writeHead(405, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`PR Review Agent UI running at http://localhost:${port}`);
});
