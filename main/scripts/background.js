// Background Script for AI Assistant Extension (Service Worker for Manifest V3)
// Handles message passing between content scripts and manages AI requests

// Browser detection for service worker
const isFirefox = typeof browser !== 'undefined' && browser.storage;
const isChrome = typeof chrome !== 'undefined' && chrome.storage;
const browserAPI = isFirefox ? browser : (isChrome ? chrome : null);

console.log('Background service worker loaded');
console.log('Background script - browserAPI:', browserAPI, 'isFirefox:', isFirefox, 'isChrome:', isChrome);

// Handle messages from content scripts
browserAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Background received message:', msg.type, 'from tab:', sender.tab.id);
    
    if (msg.type === "aiAsk") {
        // Forward AI request to content script
        browserAPI.tabs.sendMessage(sender.tab.id, {
            type: 'aiAsk', 
            data: msg.data
        }).catch(error => {
            console.error('Failed to send AI request to content script:', error);
        });
    }
    
    if (msg.type === 'processAiAnswer') {
        // Get button autoclick setting
        browserAPI.storage.local.get('button-autoclick')
        .then(btn => {
            const clickType = btn['button-autoclick'] ? 'auto' : 'manual';
            
            // Send answer to content script for clicking
            browserAPI.tabs.sendMessage(sender.tab.id, {
                multi: msg.data.multi,
                clickType: clickType,
                type: 'clickButton',
                msg: msg.data.reply
            }).catch(error => {
                console.error('Failed to send click command to content script:', error);
            });
        })
        .catch(error => {
            console.error('Failed to get button-autoclick setting:', error);
        });
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
});

// Handle extension installation
browserAPI.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    
    // Set default settings
    browserAPI.storage.local.set({
        'button-autoclick': false,
        'start-checkbox': true
    });
});

// Handle tab updates to inject content script
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Content script will handle test detection on the page
        console.log('Page loaded:', tab.url);
    }
});

console.log('Background script initialized');
