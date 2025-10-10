// background, using to transfer data \._./
browser.runtime.onMessage.addListener((msg,sender,sendresponse)=>{
    if (msg.type === "aiAsk"){
        //add api call to a db
        browser.tabs.sendMessage(sender.tab.id,{type:'aiAsk',data:msg.data})
    }
    if (msg.type == 'processAiAnswer'){
        browser.storage.local.get('button-autoclick')
        .then(btn => {
            if (btn){ browser.tabs.sendMessage(sender.tab.id,{multi:msg.data.multi,clickType:'manual',type:'clickButton',msg:msg.data.reply})}
        })
    }    
       
})
