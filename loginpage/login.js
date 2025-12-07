const btn = document.getElementById("enterBtn");
const username = document.getElementById("username");

username.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    btn.click();
  }
});

btn.addEventListener("click", async () => {
  const user = username.value.trim();
  if (user === "") {
    alert("Please enter a username to continue.");
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: user }),
    });

    const data = await response.json();

    if (data.success) {
      const params = new URLSearchParams({
        player_id: data.player_id,
        username: data.username,
      });
      location.href = `/game?${params.toString()}`;
    } else {
      alert(
        "Login failed: " +
          (data.messages ? data.messages.join("\n") : "Unknown error")
      );
    }
  } catch (error) {
    alert("Error: " + error);
  }
});
