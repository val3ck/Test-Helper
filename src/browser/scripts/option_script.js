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
// setting select options
/* pseudocode
getAllSelects()
    .forEachSelect(select=>
        look_in_storage(select->id)
        if result_look_in_storage == undefined
            keep -> last_value // keep is bool
        else
            keep -> value_in_storage // keep is bool
        set_checkbox_state(keep) 
        set_value_inStorage(keep) // we're setting value, to be sure, that it will be in local data
        looking_for_clicks(
            click -> setValue.checked // we're looking if input is checked 
            saving_toStorage(click)
            )
    )       
*/
let options = document.querySelectorAll('select') 
    .forEach(result=>{
        let id = result.id
        let res_val = result.value;
        console.log(id,res_val)
        browser.storage.local.get(id) //the same
            .then(response=>{
                if (response[id]) res_val = response[id];
                result.value = res_val
                browser.storage.local.set({[id]:res_val})
                console.log(res_val,id,response)
                result.addEventListener('change',()=>{
                    res_val = result.value
                    browser.storage.local.set({[id]:res_val})
                })
            })
})

// saving topic
browser.storage.local.get('topicForAI').then(elem=>{
    let helpinp = document.getElementById("helpInput")
    if (elem['topicForAI'] == undefined) {
        helpinp.value = '' ; 
        return
    }
    helpinp.value = elem['topicForAI'];
})
//clearing button (reset to the last save)
document.getElementById("buttonClear").addEventListener('click',()=>{
    browser.storage.local.get('topicForAI')
        .then(response=>{
            let lasttopic = '';
            if (response) lasttopic = response['topicForAI'];
            document.getElementById("helpInput").value = lasttopic;
            console.log(response)
        })
})
// accept button, just sets input into the storage
document.getElementById("buttonAccept").addEventListener('click',()=>{
    browser.storage.local.set({topicForAI:document.getElementById("helpInput").value})
})
// applying style to BENDY
function applyBackground(value){
    let body = document.querySelector('body');
    body.style.background = 'var(--bg-main)';   
    body.style.color = '#1e1f20'
    body.style.fontFamily = "'Segoe UI', sans-serif";
    body.style.margin = "0";
    body.style.padding = "2em";
    body.style.lineHeight = "1.6";
    body.style.animation = "fadeIn 0.8s ease";
    if (value){
        body.style.backgroundImage = "url('photo_2025-10-09_19-07-40.jpg')";
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
        body.style.height = '100vh';
        body.style.margin = '0';
    }
}
// bendy checkbox
browser.storage.local.get('bendy')
    .then(resp=>{
        applyBackground(resp['bendy'])
    })
    .finally(()=>{
        browser.storage.onChanged.addListener((changes,area)=>{
            if (changes?.bendy){
                applyBackground(changes['bendy'].newValue)
            }
        })
})
// const sys = document.getElementById("sysuser");
// sys.innerText = sys.innerText +'  '+ navigator.userAgent
const parent = document.getElementById("palette-selector");
// working with pallete
browser.storage.local.get(parent.id)
    .then(resp=>{
        let color = "#00000081"
        
        if (resp != undefined) color = resp[parent.id]
        parent.value = color
        console.log(parent)
        browser.storage.local.set({[parent.id]:color})
        parent.addEventListener('input',(ev)=>{
            browser.storage.local.set({[parent.id]:ev.target.value})
        })
    })
//button which clears color pallete
document.querySelector("#buttonClears").addEventListener("click",()=>{
    let color = "#00000081"
    parent.value = color
    browser.storage.local.set({[parent.id]:color})
})
//looking for clickss
document.querySelector("#check_pc_vers").addEventListener('click',()=>{
    browser.runtime.openOptionsPage()
})
