// background, using to transfer data \._./
browser.runtime.onMessage.addListener((msg,sender,sendresponse)=>{
    if (msg.type == "aiAsk"){
        //add api call to a db
        browser.tabs.sendMessage(sender.tab.id,{type:'aiAsk',data:msg.data})
    }
    else if (msg.type=='processAiAnswer'){
        let run_throught = ['button-autoclick','button-highlight']
        run_throught.forEach(elem=>{
            // console.log(elem)
            browser.storage.local.get(elem)
            .then(btn => {

                console.log(btn[elem])
                if (btn[elem] && btn[elem] != 'none'){ 
                    browser.tabs.sendMessage(sender.tab.id,{
                        multi:msg.data.multi,type:elem,add_type:btn[elem],msg:msg.data.reply
                    }
                )}
            })
        }) 
    }
     
})
