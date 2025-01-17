import { Readability } from '@mozilla/readability';

console.log("Content script is running.");

// 存储侧边栏状态
let sidebarVisible = true;

// 向 background script 发送消息
chrome.runtime.sendMessage({ type: "contentLoaded", message: "Content script loaded" });

// 创建并插入侧边栏
function createSidebar() {
    // 创建控制按钮
    const toggleButton = document.createElement('div');
    toggleButton.innerHTML = `
        <div id="sidebar-toggle" style="
            position: fixed !important;
            top: 50% !important;
            right: ${sidebarVisible ? '450px' : '0'} !important;
            transform: translateY(-50%) !important;
            background: #4CAF50 !important;
            color: white !important;
            padding: 10px !important;
            cursor: pointer !important;
            border-radius: 4px 0 0 4px !important;
            box-shadow: -2px 0 5px rgba(0,0,0,0.1) !important;
            z-index: 2147483647 !important;
            transition: right 0.3s ease !important;
        ">
            ${sidebarVisible ? '›' : '‹'}
        </div>
    `;

    const sidebarHTML = `
        <div id="content-sidebar" style="
            position: fixed !important;
            top: 0px !important;
            right: 0px !important;
            width: 25vw !important;
            min-width: 300px !important;
            max-width: 450px !important;
            height: 100vh !important;
            background: white !important;
            box-shadow: rgba(0, 0, 0, 0.1) -2px 0px 5px !important;
            z-index: 2147483647 !important;
            padding: 10px !important;
            overflow-y: auto !important;
            box-sizing: border-box !important;
            font-family: Arial, sans-serif !important;
            display: flex !important;
            flex-direction: column !important;
            transition: transform 0.3s ease !important;
        ">
            <button id="parse-button" style="
                width: 100% !important;
                padding: 8px !important;
                margin-bottom: 10px !important;
                background: rgb(76, 175, 80) !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: bold !important;
                flex-shrink: 0 !important;
            ">解析页面</button>
            <textarea id="parsed-content" style="
                width: 100% !important;
                height: calc(100vh - 120px) !important;
                padding: 10px !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
                color: rgb(51, 51, 51) !important;
                background: rgb(255, 255, 255) !important;
                border: 1px solid rgb(204, 204, 204) !important;
                border-radius: 4px !important;
                resize: none !important;
                flex-grow: 1 !important;
                font-family: monospace !important;
                box-sizing: border-box !important;
                white-space: pre-wrap !important;
                overflow-wrap: break-word !important;
                margin-bottom: 10px !important;
            "></textarea>
            <button id="push-button" style="
                width: 100% !important;
                padding: 8px !important;
                background: rgb(33, 150, 243) !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: bold !important;
                flex-shrink: 0 !important;
            ">推送到知识库</button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', sidebarHTML);
    document.body.appendChild(toggleButton);
    
    // 添加按钮事件监听器
    document.getElementById('parse-button').addEventListener('click', parsePage);
    document.getElementById('push-button').addEventListener('click', pushToKnowledgeBase);
    
    // 添加toggle按钮事件监听
    document.getElementById('sidebar-toggle').addEventListener('click', async () => {
        sidebarVisible = !sidebarVisible;
        await chrome.storage.sync.set({ sidebarEnabled: sidebarVisible });
        updateSidebarVisibility();
    });
    
    // 读取存储的设置并设置初始状态
    chrome.storage.sync.get('sidebarEnabled', (result) => {
        sidebarVisible = result.sidebarEnabled !== false;
        updateSidebarVisibility();
    });
}

// 更新侧边栏可见性
function updateSidebarVisibility() {
    const sidebar = document.getElementById('content-sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    
    if (sidebar && toggle) {
        console.log('Updating sidebar visibility:', sidebarVisible);
        sidebar.style.transform = sidebarVisible ? 'translateX(0)' : 'translateX(100%)';
        toggle.style.right = sidebarVisible ? '450px' : '0';
        toggle.innerHTML = sidebarVisible ? '›' : '‹';
    } else {
        console.log('Sidebar or toggle element not found');
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message); // 调试日志
    if (message.type === 'toggleSidebar') {
        console.log('Toggling sidebar:', message.enabled); // 调试日志
        sidebarVisible = message.enabled;
        updateSidebarVisibility();
        sendResponse({ success: true }); // 发送响应
    }
    return true; // 保持消息通道开放
});

// 解析页面内容
function parsePage() {
    var documentClone = document.cloneNode(true);
    var article = new Readability(documentClone).parse();
    
    const outputData = {
        name: article.title,
        text: article.textContent,
        indexing_technique: "high_quality",
        process_rule: {
            mode: "automatic"
        }
    };
    
    document.getElementById('parsed-content').value = JSON.stringify(outputData, null, 2);
}

// 推送到知识库
async function pushToKnowledgeBase() {
    try {
        // 检查是否已解析内容
        const parsedContent = document.getElementById('parsed-content').value;
        if (!parsedContent) {
            alert('请先解析页面内容');
            return;
        }

        // 获取 Dify 配置
        const config = await chrome.storage.sync.get(['difyApiEndpoint', 'difyApiKey']);
        
        if (!config.difyApiEndpoint || !config.difyApiKey) {
            alert('请先在插件配置中设置 Dify API 接入点和 API Key');
            return;
        }

        // 显示推送状态
        const pushButton = document.getElementById('push-button');
        const originalText = pushButton.textContent;
        pushButton.textContent = '推送中...';
        pushButton.disabled = true;

        try {
            // 解析 JSON 内容
            const contentData = JSON.parse(parsedContent);
            
            // 发送请求到 Dify API
            const response = await fetch(config.difyApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.difyApiKey}`
                },
                body: JSON.stringify(contentData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            alert('推送成功！');
            
        } catch (error) {
            console.error('推送失败:', error);
            alert(`推送失败: ${error.message}`);
        }

    } catch (error) {
        console.error('操作失败:', error);
        alert(`操作失败: ${error.message}`);
    } finally {
        // 恢复按钮状态
        const pushButton = document.getElementById('push-button');
        pushButton.textContent = '推送到知识库';
        pushButton.disabled = false;
    }
}

// 在页面加载完成后创建侧边栏
createSidebar();
