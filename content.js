// Load API key
const GEMINI_API_KEY = window.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = window.OPENROUTER_API_KEY || "";

const containerHTML = `
  <button id="arb-toggle-btn">≡</button>
  <div id="arb-calculator-container">
    <button id="arb-close-btn">×</button>
    <h3>Arbitrage Calculator</h3>

    <div class="mode-tabs">
      <button class="mode-tab active" data-mode="mode3">Mode 1</button>
      <button class="mode-tab" data-mode="mode1">Mode 2</button>
    </div>

    <div id="mode3" class="mode-content active">
      <form id="arb-form">
        <label for="stake">Total Stake</label>
        <input type="number" id="stake" placeholder="e.g. 100" required />
        <div id="odds-inputs"></div>
        <div class="btn-row">
          <button type="button" id="add-bet">+ Add Bet</button>
          <button type="submit">Calculate</button>
          <button type="button" id="reset">Reset</button>
        </div>
      </form>
      <div id="result"></div>
    </div>

    <div id="mode1" class="mode-content">
      <div class="toggle-row">
        <label><input type="radio" name="bet-mode" value="odds" checked> Compare Team Odds</label>
        <label><input type="radio" name="bet-mode" value="manual"> Manual Bet Query</label>
      </div>

      <div id="odds-input-section">
        <input type="text" id="sport" placeholder="Sport (e.g. Football)" />
        <input type="date" id="match-date" />
        <input type="text" id="team-a" placeholder="Team A Name">
        <input type="number" id="odds-a" placeholder="Team A Odds (optional)">
        <input type="text" id="team-b" placeholder="Team B Name">
        <input type="number" id="odds-b" placeholder="Team B Odds (optional)">
      </div>

      <textarea id="bet-query" placeholder="Describe your bet..." rows="6" style="width: 100%; display: none;"></textarea>
      <div class="btn-row">
        <button id="analyze-btn">Analyze Bet</button>
        <button id="reset-mode1">Reset</button>
      </div>
      <div id="analysis-result" style="margin-top: 10px;"></div>
    </div>

    <p style="font-size: 11px; margin-top: 20px; color: gray;">
      ⚠️ This tool is powered by AI and does not guarantee results. Betting involves financial risk. Use at your own discretion.
    </p>
  </div>
`;
document.body.insertAdjacentHTML("beforeend", containerHTML);

// DOM references
const container = document.getElementById("arb-calculator-container");
const toggleBtn = document.getElementById("arb-toggle-btn");
const closeBtn = document.getElementById("arb-close-btn");
const form = document.getElementById("arb-form");
const stakeInput = document.getElementById("stake");
const oddsContainer = document.getElementById("odds-inputs");
const addBetBtn = document.getElementById("add-bet");
const resetBtn = document.getElementById("reset");
const resultBox = document.getElementById("result");

const analyzeBtn = document.getElementById("analyze-btn");
const resetMode1Btn = document.getElementById("reset-mode1");
const betQuery = document.getElementById("bet-query");
const analysisResult = document.getElementById("analysis-result");
const betModeRadios = document.getElementsByName("bet-mode");

const oddsSection = document.getElementById("odds-input-section");
const manualQuery = document.getElementById("bet-query");

const sportInput = document.getElementById("sport");
const matchDateInput = document.getElementById("match-date");
const teamAInput = document.getElementById("team-a");
const teamAOddsInput = document.getElementById("odds-a");
const teamBInput = document.getElementById("team-b");
const teamBOddsInput = document.getElementById("odds-b");

// Slide-in logic
toggleBtn.addEventListener("click", () => container.classList.toggle("open"));
closeBtn.addEventListener("click", () => container.classList.remove("open"));

// Mode switching with auto reset
document.querySelectorAll(".mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".mode-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".mode-content")
      .forEach((mc) => mc.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.mode).classList.add("active");
    if (tab.dataset.mode === "mode1") {
      resetMode1Btn.click();
    } else {
      resetBtn.click();
    }
  });
});

// Odds/manual toggle with auto reset
betModeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    const mode = document.querySelector('input[name="bet-mode"]:checked').value;
    oddsSection.style.display = mode === "odds" ? "block" : "none";
    manualQuery.style.display = mode === "manual" ? "block" : "none";
    resetMode1Btn.click();
  });
});

// Add odds row
addBetBtn.addEventListener("click", () => {
  const count = oddsContainer.children.length + 1;
  const betRow = document.createElement("div");
  betRow.classList.add("bet-row");
  betRow.innerHTML = `
    <label>Bet ${count} Odds</label>
    <input type="number" step="any" class="odd" placeholder="e.g. 1.9">
  `;
  oddsContainer.appendChild(betRow);
});

// Reset arbitrage
resetBtn.addEventListener("click", () => {
  oddsContainer.innerHTML = "";
  for (let i = 1; i <= 2; i++) {
    const betRow = document.createElement("div");
    betRow.classList.add("bet-row");
    betRow.innerHTML = `
      <label>Bet ${i} Odds</label>
      <input type="number" step="any" class="odd" placeholder="e.g. ${
        i + 1
      }" required>
    `;
    oddsContainer.appendChild(betRow);
  }
  stakeInput.value = "";
  resultBox.innerHTML = "";
});

// Reset mode1
resetMode1Btn.addEventListener("click", () => {
  sportInput.value = "";
  matchDateInput.value = "";
  teamAInput.value = "";
  teamAOddsInput.value = "";
  teamBInput.value = "";
  teamBOddsInput.value = "";
  betQuery.value = "";
  analysisResult.innerHTML = "";
});

// Calc arbitrage
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const stake = parseFloat(stakeInput.value);
  if (isNaN(stake) || stake <= 0) {
    alert("Enter valid stake");
    return;
  }

  const odds = Array.from(document.querySelectorAll(".odd"))
    .map((input) => parseFloat(input.value))
    .filter((val) => !isNaN(val) && val > 0);

  if (odds.length < 2) {
    alert("Enter at least 2 valid odds");
    return;
  }

  const totalInverse = odds.reduce((sum, o) => sum + 1 / o, 0);
  if (totalInverse >= 1) {
    const loss = stake * (1 - 1 / totalInverse);
    resultBox.innerHTML = `
      <div class="result-box negative">
        <strong>No arbitrage opportunity.</strong><br>
        Potential Loss: ${loss.toFixed(2)}
      </div>
    `;
    return;
  }

  let html = `<div class="result-box positive">`;
  let totalPayout = 0;
  odds.forEach((odd, i) => {
    const stakePerBet = stake / odd / totalInverse;
    const payout = stakePerBet * odd;
    totalPayout = payout;
    html += `<div><strong>Bet ${i + 1}</strong>: Stake = ${stakePerBet.toFixed(
      2
    )}, Payout = ${payout.toFixed(2)}</div>`;
  });

  const profit = totalPayout - stake;
  const roi = (profit / stake) * 100;
  const color = profit >= 0 ? "lightgreen" : "red";
  const label = profit >= 0 ? "Profit" : "Loss";

  html += `<div>Total Payout: ${totalPayout.toFixed(2)}</div>`;
  html += `<div style="color:${color};"><strong>Total ${label}:</strong> ${profit.toFixed(
    2
  )}</div>`;
  html += `<div>ROI: ${roi.toFixed(2)}%</div>`;
  html += `</div>`;

  resultBox.innerHTML = html;
});

// Default reset
resetBtn.click();

// Analyze
analyzeBtn.addEventListener("click", async () => {
  let query = betQuery.value.trim();

  if (!query) {
    const sport = sportInput.value.trim();
    const date = matchDateInput.value;
    const teamA = teamAInput.value.trim();
    const oddsA = teamAOddsInput.value.trim();
    const teamB = teamBInput.value.trim();
    const oddsB = teamBOddsInput.value.trim();

    if (!teamA || !teamB) {
      alert("Please fill both team names.");
      return;
    }

    const currentYear = new Date().getFullYear();
    query = `Analyze the upcoming ${sport || "sport"} match between ${teamA} ${
      oddsA ? `(odds: ${oddsA})` : ""
    } and ${teamB} ${oddsB ? `(odds: ${oddsB})` : ""} scheduled around ${
      date || "the near future"
    }. Focus on recent stats, team forms, venue conditions. Odds may influence outcome but aren't always decisive. Output should be short, clear, and point-wise without markdown.`;
  }

  analysisResult.innerHTML = "Analyzing...";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          {
            role: "system",
            //Prompt
            content: `You are a betting analyst. Only consider recent, live, or upcoming matches (2025 onwards). Do not use outdated data, past matches, or mention retired players. Always assume the match is current unless explicitly stated otherwise. Your analysis should be short, point-wise, and practical, focusing on recent team form, venue conditions, toss result, and updated player statistics. If odds are provided, include them as one of the factors, but do not base your prediction solely on the odds. Avoid generic statements or references to historical data. Keep the reasoning realistic, relevant, and concise. Conclude the analysis with a few betting tips—such as standout player performance or expected totals—and clearly state which team is more likely to win.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
      }),
    });

    const data = await res.json();
    const output = data.choices?.[0]?.message?.content;
    const sanitized = output
      ? output.replace(/[*#`]/g, "").replace(/\\n/g, "<br>").replace(/\\t/g, "")
      : "No response.";

    analysisResult.innerHTML = `<div style="white-space:pre-wrap">${sanitized}</div>`;
  } catch (err) {
    analysisResult.innerHTML = `<div style="color:red;">Error: ${err.message}</div>`;
  }
});