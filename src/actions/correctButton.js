browser.runtime.onMessage.addListener((msg)=>{
    if (msg.type == "click")
    console.log(msg)
})