// looking for checkboxes

document.querySelectorAll("input[type='checkbox']").forEach(checkbx => {
    // if there any changes already => we're looking for them
    browser.storage.local.get(checkbx.id)
        .then(response=>{
            // changing checkbx to the last recorded state 
            checkbx.checked = response[checkbx.id]
            checkbx.addEventListener('change',()=>{ // lf changes
                browser.storage.local.set({[checkbx.id]: checkbx.checked})
            }) // setting last recorded state
        })
});
let options = document.querySelectorAll('select') 
    .forEach(result=>{
        let id = result.id
        let res_val = result.value;
        browser.storage.local.get(id) //the same
            .then(response=>{
                res_val = 'none'
                if (response[id]) res_val = response[id];
                result.value = res_val
                console.log(res_val)
                result.addEventListener('change',()=>{
                    res_val = result.value
                    browser.storage.local.set({[id]:res_val})
                })
            })
})

// saving topic
browser.storage.local.get('topicForAI').then(elem=>{
    let helpinp = document.getElementById("helpInput")
    if (elem['topicForAI'] == undefined) {helpinp.value = '' ; return}
    helpinp.value = elem['topicForAI'];
})
//clearing button (reset to the last save)
document.getElementById("buttonClear").addEventListener('click',()=>{
    browser.storage.local.get('topicForAI')
        .then(response=>{
            let lasttopic = '';
            if (response) lasttopic = response['topicForAI'];
            document.getElementById("helpInput").value = lasttopic;
        })
})
// accept button, just sets input into the storage
document.getElementById("buttonAccept").addEventListener('click',()=>{
    browser.storage.local.set({topicForAI:document.getElementById("helpInput").value})
})