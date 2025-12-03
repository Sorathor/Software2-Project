let playerId = null;
let playerUsername = null;
let currentCompanions = [];
let currentWildCreatures = [];
let currentCompanionId = null;
let currentHabitatsData = null;

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  playerId = params.get("player_id");
  playerUsername = params.get("username");

  if (!playerId) {
    location.href = "/";
  } else {
    showPage("mainPage");
  }
});

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  document.getElementById(pageId).classList.add("active");
}

function showPopup(message) {
  const popup = document.getElementById("popup");
  const popupMessage = document.getElementById("popupMessage");
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

async function loadExplorePage() {
  showPage("explorePage");

  try {
    const response = await fetch(`/explore/start?player_id=${playerId}`);
    const data = await response.json();

    if (data.success && data.companions) {
      currentCompanions = data.companions;
      const companionList = document.getElementById("companionList");
      companionList.innerHTML = "";

      data.companions.forEach((comp) => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = `${comp.nickname} (${comp.type})`;
        btn.onclick = () => selectCompanion(comp.id);
        companionList.appendChild(btn);
      });

      document.getElementById("companionSelection").classList.remove("hidden");
      document.getElementById("wildSelection").classList.add("hidden");
    } else {
      showPopup(
        data.messages ? data.messages.join("\n") : "Cannot explore",
        false
      );
      showPage("mainPage");
    }
  } catch (error) {
    showPopup("Error: " + error, false);
    showPage("mainPage");
  } finally {
  }
}

async function selectCompanion(companionId) {
  currentCompanionId = companionId;

  try {
    const response = await fetch("/explore/encounter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_id: playerId,
        companion_id: companionId,
      }),
    });

    const data = await response.json();

    if (data.complete) {
      showPopup("Congratulations! You've caught them all!", true);
      showPage("mainPage");
      return;
    }

    if (data.success && data.wild_creatures) {
      currentWildCreatures = data.wild_creatures;
      const wildList = document.getElementById("wildList");
      wildList.innerHTML = "";

      data.wild_creatures.forEach((wild) => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = `${wild.name} (${wild.type}) - ${wild.status}`;
        btn.onclick = () => catchCreature(wild.id, wild.effectiveness);
        wildList.appendChild(btn);
      });

      document.getElementById("companionSelection").classList.add("hidden");
      document.getElementById("wildSelection").classList.remove("hidden");
    }
  } catch (error) {
    showPopup("Error: " + error, false);
  } finally {
  }
}

async function catchCreature(wildCreatureId, effectiveness) {
  try {
    const response = await fetch("/explore/catch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_id: playerId,
        wild_creature_id: wildCreatureId,
        companion_id: currentCompanionId,
        effectiveness: effectiveness,
      }),
    });

    const data = await response.json();

    if (data.success) {
      const message = data.caught
        ? "Success! Creature caught!"
        : "Failed! Creature escaped.";
      showPopup(message, data.caught);

      setTimeout(() => {
        hidePopup();
        showPage("mainPage");
      }, 2000);
    }
  } catch (error) {
    showPopup("Error: " + error, false);
  } finally {
  }
}

async function loadManagePage() {
  showPage("managePage");

  try {
    const response = await fetch(`/habitats?player_id=${playerId}`);
    const data = await response.json();

    if (data.success) {
      currentHabitatsData = data.habitats;

      for (let i = 1; i <= 4; i++) {
        document.getElementById(`habitat${i}`).innerHTML = "";
      }
      data.habitats.forEach((habitat) => {
        const habitatEl = document.getElementById(`habitat${habitat.number}`);

        if (habitat.creatures && habitat.creatures.length > 0) {
          habitat.creatures.forEach((creature) => {
            const div = document.createElement("div");
            div.className = "creature-item";
            div.textContent = `${creature.nickname} (${creature.type})`;
            div.onclick = () => moveCreature(creature.id, habitat.id);
            habitatEl.appendChild(div);
          });
        } else {
          habitatEl.textContent = "(empty)";
        }
      });

      const unplacedEl = document.getElementById("unplacedList");
      unplacedEl.innerHTML = "";

      if (data.unplaced && data.unplaced.length > 0) {
        data.unplaced.forEach((creature) => {
          const div = document.createElement("div");
          div.className = "creature-item";
          div.textContent = `${creature.nickname} (${creature.type})`;
          div.onclick = () => moveCreature(creature.id, null);
          unplacedEl.appendChild(div);
        });
      } else {
        unplacedEl.textContent = "(none)";
      }
    }
  } catch (error) {
    showPopup("Error: " + error, false);
    showPage("mainPage");
  } finally {
  }
}

async function moveCreature(creatureId) {
  // Ask user hab
  const targetHabitat = prompt("Move to habitat (1-4) or 0 for unplaced:");

  if (targetHabitat === null) return;

  const targetNum = parseInt(targetHabitat);

  if (isNaN(targetNum) || targetNum < 0 || targetNum > 4) {
    showPopup("Invalid habitat number", false);
    return;
  }

  let targetHabitatId = null;
  if (targetNum > 0) {
    const targetHab = currentHabitatsData.find((h) => h.number === targetNum);
    if (targetHab) {
      targetHabitatId = targetHab.id;
    }
  }

  try {
    const response = await fetch("/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_id: playerId,
        creature_id: creatureId,
        target_habitat_id: targetHabitatId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showPopup("Creature moved successfully!", true);
      setTimeout(() => {
        hidePopup();
        loadManagePage();
      }, 1000);
    } else {
      showPopup(
        data.messages ? data.messages.join("\n") : "Move failed",
        false
      );
    }
  } catch (error) {
    showPopup("Error: " + error, false);
  } finally {
  }
}

async function loadJournalPage() {
  showPage("journalPage");

  try {
    const response = await fetch(`/journal?player_id=${playerId}`);
    const data = await response.json();

    if (data.success) {
      const journalList = document.getElementById("journalList");
      journalList.innerHTML = "";

      const discovered = data.discovered_count || 0;
      const total = data.total_species || 16;

      const summary = document.createElement("div");
      summary.style.gridColumn = "1 / -1";
      summary.style.marginBottom = "20px";
      summary.textContent = `Discovered: ${discovered}/${total} species`;
      journalList.appendChild(summary);

      if (data.creatures) {
        data.creatures.forEach((creature) => {
          const item = document.createElement("div");
          item.className = "journal-item";

          if (creature.discovered) {
            if (creature.image) {
              const img = document.createElement("img");
              img.src = `${creature.image}`;
              img.alt = creature.name;
              item.appendChild(img);
            } else {
              const placeholder = document.createElement("div");
              placeholder.textContent = "No Image";
              placeholder.style.height = "100px";
              placeholder.style.display = "flex";
              placeholder.style.alignItems = "center";
              placeholder.style.justifyContent = "center";
              placeholder.style.border = "1px dashed #ffffffff";
              item.appendChild(placeholder);
            }

            const info = document.createElement("p");
            info.innerHTML = `<strong>${creature.name}</strong><br>(${creature.type})`;
            item.appendChild(info);
          } else {
            const placeholder = document.createElement("div");
            placeholder.textContent = "?";
            placeholder.style.fontSize = "40px";
            placeholder.style.height = "100px";
            placeholder.style.display = "flex";
            placeholder.style.alignItems = "center";
            placeholder.style.justifyContent = "center";
            placeholder.style.background = "#000000";
            item.appendChild(placeholder);

            const info = document.createElement("p");
            info.textContent = "???";
            item.appendChild(info);
          }

          journalList.appendChild(item);
        });
      }
    }
  } catch (error) {
    showPopup("Error: " + error, false);
    showPage("mainPage");
  } finally {
  }
}

// action
document
  .getElementById("exploreBtn")
  .addEventListener("click", loadExplorePage);
document.getElementById("manageBtn").addEventListener("click", loadManagePage);
document
  .getElementById("journalBtn")
  .addEventListener("click", loadJournalPage);
document.getElementById("exitBtn").addEventListener("click", () => {
  if (confirm("Are you sure you want to exit?")) {
    location.href = "/";
  }
});
document.getElementById("againBtn").addEventListener("click", () => {
  location.href = "/";
});
document.getElementById("wildBackBtn").addEventListener("click", () => {
  if (!document.getElementById("wildSelection").classList.contains("hidden")) {
    loadExplorePage();
  } else {
    showPage("mainPage");
  }
});

document
  .getElementById("manageBackBtn")
  .addEventListener("click", () => showPage("mainPage"));
document
  .getElementById("journalBackBtn")
  .addEventListener("click", () => showPage("mainPage"));
document.getElementById("popupOkBtn").addEventListener("click", hidePopup);
