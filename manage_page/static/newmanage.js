'use strict';
//global variables
const player_id = 2
let creature_name_to_move = null;
let habitat_id_to_move = null;
let divbox_selection = document.querySelector(".habitat_table") 
let divbox_selection_buttons = document.querySelector("#manage_btn")
let edit_btn = document.querySelector("#Editbtn")
let edit_text = document.createElement('h4')
// edit_text.id = 'normal_color'
edit_text.innerHTML = ''
divbox_selection_buttons.appendChild(edit_text)

//load creatures in the habitat api call 
async function get_habitat_api() {
    let url = `http://127.0.0.1:8080//habitats?player_id=${player_id}`
    const response = await fetch(url)
    const result = await response.json()
    // console.log(result, "The result of api call from get_habitat_api function")
    return result
}
async function move_habitat_API(creatureID, targetID) {
    // console.log(creatureID)
    // console.log(targetID)
    
    let url = `http://127.0.0.1:8080/move`
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                player_id: player_id,
                creature_id: creatureID,
                target_habitat_id: targetID,
            }),
        })
        const result = await response.json()
        return result
    } catch (error) {
        return JSON.stringify({ status: "fail", message: str(error) })
    }
}

async function get_habitat() {
    //call api function to get the json from the api
    const call_fn = await get_habitat_api();
    // console.log(call_fn.success, "success or failure msg")
    if (!call_fn.success) return; 
        // console.log(call_fn, "get_habitat result api call")
        //create elements to add into the html
        divbox_selection.innerHTML = ''
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

                unplacedtd.innerHTML = 'Unplaced'
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
        else {
            let unplacedtr = document.createElement('tr')
                let  unplacedtd = document.createElement('td')

                unplacedtd.innerHTML = 'Unplaced'
                unplacedtr.appendChild(unplacedtd)
                tbody.appendChild(unplacedtr)
        }
    }
// let button_div = document.querySelector("#manage_btn")
// let h = document.createElement('h3')
// let edit_mode = Boolean(false)

edit_btn.addEventListener('click', async()=>{
    edit_text.style.color = 'black'
    console.log('clicked')
    let m = edit_clik()
})

async function edit_clik(params) {
    // divbox_selection_buttons.innerText='Click the creature you want to move'
    edit_text.innerText= null;
    edit_text.innerText = "Click an image of a creature"
    setTimeout(()=>{
        edit_text.innerText = ''
    },3000)
    let valuea = await edit_click()
    console.log(valuea, 'this is valuea')
    console.log(typeof(valuea), 'check qqq')
    let z = [1,2,3,4,'U']
    if (!z.includes(valuea)){
        edit_text.innerText=`You selected ${valuea}. Now click the habitat you want to move`
        setTimeout(()=>{
        edit_text.innerText = ''
         },3000)
        edit_text.style.color = '#071bccff'
        // divbox_selection.style.color = 'green'
        console.log('if image')
        let valueb = await edit_click()
        // console.log(valueb)
        if (z.includes(valueb)){
            console.log(valueb)
            befor_move_api(valuea, valueb)
        }
        
    }
    else {
        alert("Click the creature first")
        // edit_text.innerText="Click the abitat first"
        console.log('if 1234')
        }

}

async function edit_click() {
    return new Promise((resolve)=>{
        function clk(evt){
            let target = evt.target
            // console.log(target)
            // resolve(target)
            // console.dir(target)
            // console.log(target.alt)
            if (target.tagName=="IMG"){
                let g = target.alt
                // console.log(g,'the value inside if stmnt')
                divbox_selection.removeEventListener('click', clk)
                resolve(g)
            }
            if (target.tagName=="TD"){
                let g = target.innerText
                // console.log(g, 'the value of habitat row')
                // console.log(g.split(" ")[1], 'this is hab no')
                let p = g.split(" ")[1]

                // if(p)
                // console.log(typeof(p))
                if (g.startsWith('Un')){
                    // console.log('unplaced')
                    let g = "U"
                    divbox_selection.removeEventListener('click', clk)
                    resolve(g)


                }
                else {
                    // console.log('habitat with numbers')
                    let q = p
                    divbox_selection.removeEventListener('click', clk)
                    let z = parseInt(q)
                    resolve(z)
                }
            }


        }
       divbox_selection.addEventListener('click', clk)
        // console.log(x)
    })
    
}


// console.log(habitat_event_caught)
// }

async function befor_move_api(crt_name, hab_id) {
    let result = await get_habitat_api()
    console.log(result.habitats, "this is habitat")
    console.log(result.unplaced, "This is unplaced")
    console.log(crt_name, hab_id, 'inside before move api fn')
    const habitats_creature_id = []
    const creature_own_list =[]
    console.log(result.habitats.length, "now go to loop from this")
    let call_move_crt_id = null
    let call_move_hab_id = null
    for (let i = 0; i<result.habitats.length; i++){
        let tot = result.habitats[i]['creatures']
        let g = result.habitats[i]['number']
        // console.log(typeof(g))
        console.log(g, "habitat id number")
        if (hab_id===g){
            call_move_hab_id = result.habitats[i]['id']
            console.log(call_move_hab_id, "onceeeeeeeee")
        }
        // console.log(tot, `this is ${i} loop`)
        for (let j =0; j <tot.length; j++){
            let b = result.habitats[i]['creatures'][j]["id"]
            let c = result.habitats[i]['creatures'][j]["nickname"]
            console.log(b, 'hello', j, 'loop')
            habitats_creature_id.push(b)
            let response = {
                'id' : b,
                'creature_name': c
            }
            creature_own_list.push(response)

        }        
        }
    for  (let i =0; i<result.unplaced.length; i++){
        let b = result.unplaced[i]['id']
        let c = result.unplaced[i]['nickname']
        console.log(b, "this is b")
        habitats_creature_id.push(b)
        let zilo = {
            'id': b,
            'creature_name': c
        }
        creature_own_list.push(zilo)
        
    }
    
        console.log(habitats_creature_id, 'this is the list')

        // console.log(crt_name, 'crt_name  ')
        // console.log(hab_id, "hab_id")
        console.log(creature_own_list, 'this is the creature own list')
        console.log(creature_own_list.length, 'this is the creature own list length')
        for (let i = 0; i<creature_own_list.length; i++){
            console.log(creature_own_list[i].creature_name, "name printing insite for last")
            let c = creature_own_list[i].creature_name
            console.log(creature_own_list[i].id, "name printing insite for last")
            let l = creature_own_list[i].id
            if (crt_name.toLowerCase() ===c.toLowerCase()){
                call_move_crt_id = creature_own_list[i].id
            }

            


        }
        console.log(call_move_crt_id, call_move_hab_id, 'this is to be passed to move api')
        if (call_move_crt_id && call_move_hab_id){
            console.log('true')
        }
        if (!call_move_crt_id && call_move_hab_id){
            console.log('false')
        }
        let move_now = await move_habitat_API(call_move_crt_id, call_move_hab_id)

        console.log(move_now)
    
        if (move_now.success){
            await get_habitat()
            edit_text.innerText = `${move_now['messages'][1]}`
            setTimeout(() => {
                edit_text.innerText = ''
                
            }, 3000);
        }
        if (!move_now.success){
            edit_text.innerText = `${move_now['messages'][1]}`
            setTimeout(() =>{
                edit_text.innerText = ''
            }, 3000)
        }
    


    
}


get_habitat()