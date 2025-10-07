// looking for checkboxes

document.querySelectorAll("input[type='checkbox']").forEach(checkbx => {
    // if there any changes already => we're looking for them
    browser.storage.local.get(checkbx.id)
        .then(response=>{
            // changing checkbx to the last recorded state 
            checkbx.checked = response[checkbx.id]
            console.log(response) 
            checkbx.addEventListener('change',()=>{ // lf changes
                browser.storage.local.set({[checkbx.id]: checkbx.checked})
            }) // setting last recorded state
        })
});