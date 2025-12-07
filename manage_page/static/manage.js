const params = new URLSearchParams(location.search);
const player_id = params.get("player_id");

if (!player_id) {
  location.href = "/";
}
let value1 = "";
let value2 = "";

const table = document.querySelector(".habitat_table");
const cdiv = document.createElement("div");

let h4 = document.createElement("h4");
h4.innerText = "";

const edit = document.getElementById("Editbtn");
edit.addEventListener("click", async () => {
  console.log("You Clicked the Edit Button");

  value1, (value2 = await edit_btn());

  let value3 = await move_creature(value1, value2);
  console.log(value3, "this is value 3");
});

async function edit_btn() {
  let div = document.querySelector("#manage_btn");

  h4.innerText = "Click the creature image that you want to move";

  div.appendChild(h4);

  value1 = await after_click();

  h4.innerText = `You Selected ${value1.toUpperCase()}\n Click the habitat name where you want it to locate`;

  value2 = await after_click();
  ////add the logic to move only after checking the slot if either full or not
  h4.innerText = `You moved ${value1} to the ${value2}`;
  // console.log(value1,value2)
  return value1, value2;
}

function after_click() {
  return new Promise((resolve) => {
    function handler(event) {
      const target = event.target;

      //if an image is selected
      if (target.tagName === "IMG") {
        const src = target.src;
        const fileName = src.substring(src.lastIndexOf("/") + 1);
        const nameWithoutExt = fileName.split(".")[0];

        console.log("User clicked image:", nameWithoutExt);

        table.removeEventListener("click", handler);
        resolve(nameWithoutExt);
      }

      //if habitat row is selectd
      else if (target.tagName === "TD" && target.cellIndex === 0) {
        const habitatName = target.innerText.trim();
        console.log("User clicked habitat:", habitatName);

        table.removeEventListener("click", handler);
        resolve(habitatName);
      }
    }

    table.addEventListener("click", handler);
  });
}

const data = document.querySelector(".habitat_table");

async function get_habitat(params) {
  const url = `http://127.0.0.1:8080//habitats?player_id=${player_id}`;
  try {
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    return JSON.stringify({ status: "fail", message: String(error) });
  }
}

async function move_habitat_API(creatureID, targetID) {
  let url = `http://127.0.0.1:8080/move`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: player_id,
        creature_id: creatureID,
        target_habitat_id: targetID,
      }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    return JSON.stringify({ status: "fail", message: String(error) });
  }
}
async function put_habitat(params) {
  //create a variable habitatbox that will be the main table
  const habitatbox = document.querySelector(".habitat_table");
  if (!habitatbox) return;

  habitatbox.innerHTML = "";
  const table = document.createElement("table");

  table.id = "managetable";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Habitat</th><th colspan='4'>Creature</th></tr>";

  let r = await get_habitat();
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);
  habitatbox.appendChild(table);

  //loop through result to fetch the habitat number
  if (r["habitats"]) {
    for (let i = 0; i < r["habitats"].length; i++) {
      let tr = document.createElement("tr");
      let num = r["habitats"][i];
      let td = document.createElement("td");
      let habitat_num = `Habitat ${num.number}`;
      td.innerText = `${habitat_num}`;
      tr.appendChild(td);

      //loop to get the specific creature in specific habitat to get the name for the image
      //append each image in the specific tr of the table

      for (let j = 0; j < r["habitats"][i]["creatures"].length; j++) {
        let td2 = document.createElement("td");
        let crtr_name = r["habitats"][i]["creatures"][j]["nickname"];
        let img_name = crtr_name.toLowerCase();
        let a = `/images/${img_name}.png`;
        td2.innerHTML = `<img src =" ${a}">`;
        tr.appendChild(td2);
      }
      //append the habitat name in the table
      tbody.appendChild(tr);
    }
  }

  // Display unplaced creatures
  if (r["unplaced"] && r["unplaced"].length > 0) {
    let tr = document.createElement("tr");
    let td = document.createElement("td");
    td.innerText = "Unplaced";
    tr.appendChild(td);

    for (let j = 0; j < r["unplaced"].length; j++) {
      let td2 = document.createElement("td");
      let crtr_name = r["unplaced"][j]["nickname"];
      let img_name = crtr_name.toLowerCase();
      let a = `/images/${img_name}.png`;
      td2.innerHTML = `<img src =" ${a}">`;
      tr.appendChild(td2);
    }
    tbody.appendChild(tr);
  }
}

async function move_creature(value1, value2) {
  let result = await get_habitat();
  console.log(result, "this is the result of move");
  let current_habitat = [];

  // habitat creatures
  for (let i = 0; i < result["habitats"].length; i++) {
    let serial_num = i + 1;
    let target_habitat_id = result["habitats"][i]["id"];
    for (let j = 0; j < result["habitats"][i]["creatures"].length; j++) {
      let crtr_name = result["habitats"][i]["creatures"][j]["nickname"];
      let crtr_id = result["habitats"][i]["creatures"][j]["id"];

      response = {
        id: `${serial_num}`,
        creaturename: `${crtr_name}`,
        creatureid: `${crtr_id}`,
        habitat_id: `${target_habitat_id}`,
      };
      current_habitat.push(response);
    }
  }

  // unplaced creatures
  if (result["unplaced"]) {
    for (let j = 0; j < result["unplaced"].length; j++) {
      let crtr_name = result["unplaced"][j]["nickname"];
      let crtr_id = result["unplaced"][j]["id"];

      response = {
        id: "unplaced",
        creaturename: `${crtr_name}`,
        creatureid: `${crtr_id}`,
        habitat_id: null,
      };
      current_habitat.push(response);
    }
  }
  console.log(value1, value2, "crt name and habittat id in move fn");
  //    {id: '3', creaturename: 'Obscurine', creatureid: '83', habitat_id: '7'} 'this is inside the 6 loop of current_habitat in move_crtr fn'
  // return (current_habitat)

  let final_habitat_id;
  let final_creature_id;
  if (value2.startsWith("Habitat")) {
    let hab_num = +value2.split(" ")[1];
    for (let h of result.habitats) {
      if (h.number === hab_num) {
        final_habitat_id = +h.id;
      }
    }
  } else if (value2 === "Unplaced") {
    final_habitat_id = null;
  }

  for (let i = 0; i < current_habitat.length; i++) {
    console.log(
      current_habitat[i],
      `this is inside the ${i} loop of current_habitat in move_crtr fn`
    );
    let crt = current_habitat[i].creaturename;
    let hbt = current_habitat[i];

    if (crt.toLowerCase() === value1.toLowerCase()) {
      final_creature_id = +hbt.creatureid;
    }
  }

  const move_result = await move_habitat_API(
    final_creature_id,
    final_habitat_id
  );
  console.log(move_result, "response api");
  if (move_result["messages"] && move_result["messages"][1]) {
    console.log(move_result["messages"][1]);
  }

  if (move_result.success) {
    await put_habitat();
  }
  return move_result;
}

get_habitat();

put_habitat();

const backBtn = document.getElementById("Backbtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    location.href = "/game" + location.search;
  });
}
