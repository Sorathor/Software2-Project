const player_id = 2;
let value1 = null;
let value2 = null;
const table = document.querySelector(".habitat_table");
const cdiv = document.createElement("div");
let h4 = document.createElement("h4");
h4.innerText = null;
const edit = document.getElementById("Editbtn");

//adding event listener to edit button
edit.addEventListener("click", async () => {
    console.log("You Clicked the Edit Button its in edit.addevntlistnr");
    value1, value2 = await edit_btn();
    console.log("This is the value1 in edit.addevntlistnr",value1, "/nThis is the value 2 edit.addevntlistnr", value2)
    let value3 = await move_creature(value1, value2);
    console.log(value3, "this is value 3 edit.addevntlistnr");
});

//text in div of edit after click
async function edit_btn() {
    let div = document.querySelector("#manage_btn");
    h4.innerText = "Click the creature image that you want to move";
    div.appendChild(h4);
    value1 = await after_click();
    h4.innerText = `You Selected ${value1.toUpperCase()}\n Click the habitat name where you want it to locate` ;
    value2 = await after_click();
    confirm_the_move = await get_habitat()
    console.log(confirm_the_move, ">>>>>><<<<<<")
    ////TODO - add the logic to move only after checking the slot if either full or not
    // h4.innerText = `You moved ${value1} to the ${value2}`;
        
    return value1, value2;
}

// name of creature and habitat selected
function after_click() {
    return new Promise((resolve) => {
        function handler(event) {
            const target = event.target;

            //if an image is selected
            if (target.tagName === "IMG") {
                const alt = target.alt;
                          
                table.removeEventListener("click", handler); 
                resolve(alt); 
            }

            //if habitat row is selectd
            else if (target.tagName === "TD" && target.cellIndex === 0) {
                const habitatName = target.innerText.trim();
                if (target.innerText.startsWith('Hab')){
                    table.removeEventListener("click", handler);
                    resolve(habitatName);
                 }

                if (target.innerHTML.startsWith('Unp')){
                    console.log("unplaced selected")
                    table.removeEventListener("click", handler);
                    resolve(habitatName);
                } 

                }
                // console.log(target, 'new target to find unplaced')
                // console.dir(target)
                // console.log("User clicked habitat:", habitatName);

                
        }

        table.addEventListener("click", handler);
    });
}

// const data = document.querySelector(".habitat_table");

//api call to get the habitat table
async function get_habitat(params) {
    const url = `http://127.0.0.1:8080//habitats?player_id=${player_id}`;
    try{
    const response = await fetch(url);
    const result = await response.json();
    return result; 
    }
    catch (error) {
        return JSON.stringify({ status: "fail", message: str(error) });
    }
}
//api call to post the move 
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
        return JSON.stringify({ status: "fail", message: str(error) });
    }
}
// //adding creatures to the habitat
// async function put_habitat(params) {
//     let r = await get_habitat();
//     // console.log(r)
//     const habitatbox = document.querySelector(".habitat_table");
//     habitatbox.innerHTML = "";
//     const table = document.createElement("table");
//     table.id = "managetable";
//     const thead = document.createElement("thead");
//     thead.innerHTML = "<tr><th>Habitat</th><th colspan='4'>Creatures</th></tr>";
//     // thead.id="habitat_row"
//     const tbody = document.createElement("tbody");
//     table.appendChild(thead);
//     table.appendChild(tbody);
//     habitatbox.appendChild(table);

//     //loop through result to fetch the habitat number
//     for (let i = 0; i < r["habitats"].length; i++) {
//         let tr = document.createElement("tr");
//         let num = r["habitats"][i];
//         // console.log(num, "index of habitat")
//         let td = document.createElement("td");
//         let habitat_num = `Habitat ${num.number}`;
//         // console.log(habitat_num,"hab num")
//         td.innerText = `${habitat_num}`;
//         tr.appendChild(td);

//         //loop to get the specific creature in specific habitat to get the name for the image src
//         //append each image in the specific tr of the table

//         for (let j = 0; j < r["habitats"][i]["creatures"].length; j++) {
//             let td2 = document.createElement("td");
//             let crtr_name = r["habitats"][i]["creatures"][j]["nickname"];
//             // console.log(crtr_name+"This is name")
//             let img_name = crtr_name.toLowerCase();
//             let a = `../static/images/${img_name}.png`;
//             td2.innerHTML = `<img src =" ${a}">`;
//             // console.log(habitat_num+"number habitat")
//             tr.appendChild(td2);
//         }
//         //append the habitat name in the table
//         tbody.appendChild(tr);
//     }
//     //     const t = document.querySelector("#managetable")
//     // console.log(t)
// }



async function put_habitat() {
    //call api function to get the json from the api
    const call_fn = await get_habitat();
    let render = document.querySelector(".habitat_table")
    render.innerHTML=''
    // console.log(call_fn.success, "success or failure msg")
    if (!call_fn.success) return; 
        // console.log(call_fn, "get_habitat result api call")
        //create elements to add into the html
        const table_container = document.querySelector('.habitat_table')
        const table = document.createElement("table")
        table.id = "managetable"
        const thead = document.createElement('thead')
        const tbody = document.createElement('tbody')
        const td = document.createElement('td')
        
        thead.innerHTML = `<tr><th>Habitat</th><th colspan="4">Creatures</th></tr>`
        table.appendChild(thead)
        table.appendChild(tbody)
        table_container.appendChild(table)
        // console.log(call_fn['habitats'], 'habitas list inside get_habitat')
        // console.log(typeof(call_fn))
        
        for (let i =0; i <call_fn.habitats.length; i++){
            let tr = document.createElement('tr')
            let td = document.createElement('td')
            let indx = call_fn.habitats[i]
            let habitat_number = call_fn.habitats[i].number
            let creature_in_habitat = indx.creatures
            // console.log(creature_in_habitat.length, 'creatures in a list')
            // console.log(i, 'this is i')
            // console.log(indx, 'this is indx')
            // console.log(habitat_number)
            td.innerText = `Habitat ${habitat_number}` 
            tr.appendChild(td)
            tbody.appendChild(tr)
            for (let j = 0; j< creature_in_habitat.length; j++){
                // console.log(j,i, 'j')
                let td = document.createElement('td')
                let figcap = document.createElement('figure')
                let figid = creature_in_habitat[j]['id']
                let k = creature_in_habitat[j]['nickname']
                let img = k.toLowerCase()
                figcap.innerHTML= `<img src='../static/images/${img}.png' alt ='${img}'>
                                   <figcaption>${k}</figcaption>`
                // td.innerHTML = `<img src='../static/images/${img}.png' alt ='${img}'>`
                td.appendChild(figcap)
                tr.appendChild(td)
            }
        }
        if (call_fn.unplaced.length>0){
                let unplacedtr = document.createElement('tr')
                let  unplacedtd = document.createElement('td')

                unplacedtd.innerHTML = 'Unplaced Creature'
                unplacedtr.appendChild(unplacedtd)
                tbody.appendChild(unplacedtr)

                let i = call_fn.unplaced
                for (let j of i){
                    // console.log(j, 'this is j')
                    let newtd = document.createElement('td')
                    let k = j.nickname.toLowerCase()
                    
                    newtd.innerHTML = `<img src='../static/images/${k}.png' alt='${j.nickname}'>`
                    unplacedtr.appendChild(newtd) 

                }
        }
    }



















//
async function move_creature(value1, value2) {
    let result = await get_habitat();
    console.log(result, "this is the result of move")
    let creature_id = result["habitats"][0]["creatures"][0]["id"];
    // console.log(creature_id,'this is creature id')
    let target_habitat_id = result["habitats"][0]["id"];
    // console.log(target_habitat_id)
    let creature_name = result["habitats"][0]["creatures"][0]["nickname"];
    // console.log(creature_name, 'crname')
    let current_habitat = [];
    for (let i = 0; i < result["habitats"].length; i++) {
        let serial_num = i + 1;
        let target_habitat_id = result["habitats"][i]["id"];
        // let creture_id = ''
        // let trgt_id=''
        // if ("value2"=="target_habitat_id"){
        //     trgt_id = target_habitat_id
        // }
        let td = document.createElement("td");
        // let habitat_num = `Habitat ${serial_num.number}`
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
            // if ("value1"==="crtr_name"){
            //     creture_id  = crtr_id
            //     }
        }

        // const editbtn = document.querySelector("#Editbtn");

        // const editBtn = document.getElementById("Editbtn");
    }
    console.log(value1, value2, "crt name and habittat id in move fn");
    //    {id: '3', creaturename: 'Obscurine', creatureid: '83', habitat_id: '7'} 'this is inside the 6 loop of current_habitat in move_crtr fn'
    // return (current_habitat)

    let final_habitat_id = null;
    let final_creature_id = null;
    let hab_num = +(value2.split(" ")[1])
    for (let h of result.habitats){
        if (h.number === hab_num){
            final_habitat_id = parseInt(h.id)
        }
    }
 

    for (let i = 0; i < current_habitat.length; i++) {
        console.log(
            current_habitat[i],
            `this is inside the ${i} loop of current_habitat in move_crtr fn`
        );
        let crt = current_habitat[i].creaturename;
        let hbt = current_habitat[i];

        if (crt.toLowerCase() === value1.toLowerCase()) {
            
            final_creature_id = parseInt(hbt.creatureid);
            // console.log(
            //     hbt.habitat_id,
            //     final_habitat_id,
            //     hbt.creatureid,
            //     final_creature_id,
            //     "ckk habitat id check insd mv fn if condn"
            // );
        }
    }
      
    console.log(final_creature_id,  typeof final_creature_id, "type of crt id")
    console.log(final_habitat_id,typeof final_habitat_id, "type of hab id")

    const move_result  = await move_habitat_API(final_creature_id,final_habitat_id)
    if (move_result.success){
        // await put_habitat()

        h4.innerText="Moved successfully"
        await put_habitat()
    }
    if (!move_result.success){
        // await put_habitat()
        h4.innerText="Sorry invalid selection"
    }

    // console.log(move_result, "response api")
    // console.log(move_result['messages'][1])

    // if (move_result.success){
    //     console.log("ifixx")
    //     await put_habitat()
    //     console.log("<<<<ifx")
    // }
    // else{
    //     console.log(move_result, "<<<else")
    // }
    // return move_result
}

get_habitat();

put_habitat();

