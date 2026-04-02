const reviewForm = document.getElementById("reviewForm");
const resultElement = document.getElementById("result");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const statusBadge = document.getElementById("statusBadge");
const companyGuidelines = document.getElementById("companyGuidelines");
const guidelinesFile = document.getElementById("guidelinesFile");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showLogin = document.getElementById("showLogin");
const showSignup = document.getElementById("showSignup");
const googleLogin = document.getElementById("googleLogin");
const googleSignup = document.getElementById("googleSignup");
const authPanel = document.getElementById("authPanel");
const authMessage = document.getElementById("authMessage");
const profileCard = document.getElementById("profileCard");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const logoutButton = document.getElementById("logoutButton");
const historyList = document.getElementById("historyList");
const authGateText = document.getElementById("authGateText");
const historyToggle = document.getElementById("historyToggle");
const historyDrawer = document.getElementById("historyDrawer");
const historyClose = document.getElementById("historyClose");
const historyBackdrop = document.getElementById("historyBackdrop");

const state = {
  currentUser: null,
  reviews: [],
  googleAuthEnabled: false,
};

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeIcon.innerHTML = theme === "dark" ? "&#9728;" : "&#9790;";
  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
  localStorage.setItem("pr-review-theme", theme);
}

const storedTheme = localStorage.getItem("pr-review-theme");
applyTheme(storedTheme || document.body.dataset.theme || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderReview(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let listType = null;
  let listItems = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    blocks.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) {
      return;
    }
    const items = listItems.map((item) => `<li>${formatInline(item)}</li>`).join("");
    blocks.push(`<${listType}>${items}</${listType}>`);
    listItems = [];
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${formatInline(line.slice(3))}</h2>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      const content = line.replace(/^\d+\.\s+/, "");
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(content);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const content = line.replace(/^[-*]\s+/, "");
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(content);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join("");
}

function setAuthMode(mode) {
  const loginActive = mode === "login";
  loginForm.classList.toggle("hidden", !loginActive);
  signupForm.classList.toggle("hidden", loginActive);
  showLogin.classList.toggle("active", loginActive);
  showSignup.classList.toggle("active", !loginActive);
}

showLogin.addEventListener("click", () => setAuthMode("login"));
showSignup.addEventListener("click", () => setAuthMode("signup"));

guidelinesFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const text = await file.text();
  companyGuidelines.value = companyGuidelines.value.trim()
    ? `${companyGuidelines.value.trim()}\n\n${text}`
    : text;
});

function setAuthMessage(message) {
  authMessage.textContent = message || "";
}

function setHistoryDrawer(open) {
  historyDrawer.classList.toggle("hidden", !open);
  historyBackdrop.classList.toggle("hidden", !open);
}

function renderProfile() {
  if (!state.currentUser) {
    profileCard.classList.add("hidden");
    authPanel.classList.remove("hidden");
    authGateText.textContent = "Login required to save reviews";
    return;
  }

  profileCard.classList.remove("hidden");
  authPanel.classList.add("hidden");
  authGateText.textContent = "Authenticated and saving review history";
  profileName.textContent = state.currentUser.name;
  profileEmail.textContent = state.currentUser.email;

  if (state.currentUser.avatarUrl) {
    profileAvatar.style.backgroundImage = `url("${state.currentUser.avatarUrl}")`;
    profileAvatar.textContent = "";
  } else {
    profileAvatar.style.backgroundImage = "";
    profileAvatar.textContent = state.currentUser.initials || "U";
  }
}

function renderHistory() {
  if (!state.currentUser) {
    historyList.innerHTML = '<p class="empty-history">Log in to see your previous PR reviews.</p>';
    return;
  }

  if (!state.reviews.length) {
    historyList.innerHTML = '<p class="empty-history">Your saved reviews will appear here after your first run.</p>';
    return;
  }

  historyList.innerHTML = state.reviews
    .map((review) => {
      const createdAt = new Date(review.createdAt).toLocaleString();
      return `
        <button class="history-item" type="button" data-review-id="${review.id}">
          <strong>${escapeHtml(review.meta.label)}</strong>
          <span>${escapeHtml(review.meta.rating)}</span>
          <span class="history-meta">${escapeHtml(createdAt)}</span>
        </button>
      `;
    })
    .join("");

  for (const button of historyList.querySelectorAll("[data-review-id]")) {
    button.addEventListener("click", () => {
      const record = state.reviews.find((entry) => entry.id === button.dataset.reviewId);
      if (!record) {
        return;
      }

      statusBadge.textContent = "Loaded";
      resultElement.classList.remove("result-empty");
      resultElement.innerHTML = renderReview(record.review);
    });
  }
}

async function refreshSession() {
  const response = await fetch("/api/me");
  const data = await response.json();
  state.currentUser = data.user;
  state.reviews = data.reviews || [];
  state.googleAuthEnabled = Boolean(data.googleAuthEnabled);
  googleLogin.disabled = !state.googleAuthEnabled;
  googleSignup.disabled = !state.googleAuthEnabled;
  renderProfile();
  renderHistory();
}

async function submitAuthForm(url, form) {
  setAuthMessage("");
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Authentication failed.");
  }

  state.currentUser = data.user;
  state.reviews = data.reviews || [];
  renderProfile();
  renderHistory();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitAuthForm("/api/login", loginForm);
    setAuthMessage("");
  } catch (error) {
    setAuthMessage(error.message);
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitAuthForm("/api/signup", signupForm);
    setAuthMessage("");
  } catch (error) {
    setAuthMessage(error.message);
  }
});

function startGoogleAuth() {
  if (!state.googleAuthEnabled) {
    setAuthMessage("Google login is ready once your Auth0 domain, client ID, and client secret are set in .env.");
    return;
  }

  window.location.href = "/auth/google/start";
}

googleLogin.addEventListener("click", startGoogleAuth);
googleSignup.addEventListener("click", startGoogleAuth);

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  state.currentUser = null;
  state.reviews = [];
  renderProfile();
  renderHistory();
  setAuthMode("login");
  setHistoryDrawer(false);
});

historyToggle.addEventListener("click", () => {
  const isHidden = historyDrawer.classList.contains("hidden");
  setHistoryDrawer(isHidden);
});

historyClose.addEventListener("click", () => setHistoryDrawer(false));
historyBackdrop.addEventListener("click", () => setHistoryDrawer(false));

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.currentUser) {
    setAuthMessage("Please log in before creating a review.");
    authPanel.classList.remove("hidden");
    setAuthMode("login");
    return;
  }

  const formData = new FormData(reviewForm);
  const payload = {
    companyName: formData.get("companyName")?.toString() || "",
    issueUrl: formData.get("issueUrl")?.toString() || "",
    issueText: formData.get("issueText")?.toString() || "",
    prUrl: formData.get("prUrl")?.toString() || "",
    prText: formData.get("prText")?.toString() || "",
    previousCode: formData.get("previousCode")?.toString() || "",
    currentCode: formData.get("currentCode")?.toString() || "",
    companyGuidelines: formData.get("companyGuidelines")?.toString() || "",
  };

  statusBadge.textContent = "Reviewing";
  resultElement.classList.add("result-empty");
  resultElement.textContent = "Analyzing the issue, PR, and company expectations...";

  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    statusBadge.textContent = "Saved";
    resultElement.classList.remove("result-empty");
    resultElement.innerHTML = renderReview(data.review);
    state.reviews = [data.reviewRecord, ...state.reviews];
    renderHistory();
  } catch (error) {
    statusBadge.textContent = "Error";
    resultElement.classList.add("result-empty");
    resultElement.textContent = error.message;
  }
});

const authStatus = new URLSearchParams(window.location.search).get("auth");
if (authStatus === "google_not_configured") {
  setAuthMessage("Google login is not configured yet. Add your Auth0 credentials to .env and enable the Google connection in Auth0.");
}
if (authStatus === "google_failed") {
  setAuthMessage("Google login through Auth0 could not be completed. Please try again.");
}

await refreshSession();
