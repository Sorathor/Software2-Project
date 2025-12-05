const params = new URLSearchParams(window.location.search);
const playerId = params.get("player_id");

function goBack() {
  window.location.href = `/game?player_id=${playerId}`;
}

async function loadJournalPage(playerId) {
  const journal = document.getElementById("journal");

  const existingGrid = document.getElementById("journalList");
  if (existingGrid) existingGrid.remove();

  try {
    const response = await fetch(`/journal?player_id=${playerId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error("Failed to fetch journal data");
    }

    const existingSummary = document.querySelector(".journal-summary");
    if (existingSummary) existingSummary.remove();

    const summary = document.createElement("div");
    summary.className = "journal-summary";
    summary.textContent = `Discovered: ${data.discovered_count || 0} / ${
      data.total_species || 16
    }`;
    journal.appendChild(summary);

    const grid = document.createElement("div");
    grid.id = "journalList";
    journal.appendChild(grid);

    data.creatures.forEach((creature) => {
      const item = document.createElement("div");
      item.className = "journal-item";

      if (creature.discovered) {
        const img = document.createElement("img");
        img.src = `../${creature.image}`;
        img.alt = creature.name;

        img.onerror = () => {
          img.src = "https://placehold.co/600x400";
        };

        item.appendChild(img);

        const info = document.createElement("p");
        info.innerHTML = `<strong>${creature.name}</strong><br>${creature.type}`;
        item.appendChild(info);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "placeholder";
        placeholder.textContent = "???";
        item.appendChild(placeholder);

        const info = document.createElement("p");
        info.textContent = "???";
        item.appendChild(info);
      }

      grid.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading journal:", error);
    journal.textContent = "Failed to load journal.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadJournalPage(playerId);
});
