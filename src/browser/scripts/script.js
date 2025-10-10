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
        browser.storage.local.get('typeOfClicking') //the same
            .then(response=>{
                if (response == undefined) result.value = 'none';
                result.value = response.typeOfClicking
                result.addEventListener('change',()=>{
                    browser.storage.local.set({typeOfClicking:result.value})
                    console.log(result.value)
                })
            })
})

// saving topic
browser.storage.local.get('topicForAI').then(elem=>{
    let helpinp = document.getElementById("helpInput")
    if (elem['topicForAI'] == undefined) helpinp.value = ''  
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