async function get_data() {
    const url = "http://127.0.0.1:5000/journal";
    const response = await fetch(url);
    return await response.json();
}

function createRow(row) {
    // row = [id, name, type]
    const id = row[0];
    const name = row[1];
    const type = row[2];

    const div = document.createElement("div");
    div.innerHTML = `
        <p><b>SN:</b> ${id}</p>
        <p><b>Name:</b> ${name}</p>
        <p><b>Type:</b> ${type}</p>
        <hr>
    `;
    return div;
}

async function load_journal() {
    const table = document.querySelector("#journal");

    let data = await get_data(); // data = array of rows

    data.forEach(row => {
        const item = createRow(row);
        table.appendChild(item);
    });
}

load_journal();
