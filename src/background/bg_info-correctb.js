// background, using to transfer data \._./
browser.runtime.onMessage.addListener(async (msg,sender,sendresponse)=>{
    if (msg.type === "aiAsk"){
        const response = await browser.tabs.sendMessage(sender.tab.id,{type:'aiAsk',data:msg.data})
        
        let {['button-autoclick']:button} = await browser.storage.local.get('button-autoclick')
        
        if (button){
            browser.tabs.sendMessage(sender.tabs.id,{type:'clickButton',data:response})
        }
}})
