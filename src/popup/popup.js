document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('sidebarToggle');
    const apiEndpoint = document.getElementById('apiEndpoint');
    const apiKey = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveConfig');
    
    try {
        // 读取所有存储的设置
        const result = await chrome.storage.sync.get([
            'sidebarEnabled',
            'difyApiEndpoint',
            'difyApiKey'
        ]);
        
        // 设置初始值
        toggle.checked = result.sidebarEnabled !== false;
        apiEndpoint.value = result.difyApiEndpoint || '';
        apiKey.value = result.difyApiKey || '';
        
        // 立即发送侧边栏状态
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, { 
                type: 'toggleSidebar', 
                enabled: toggle.checked 
            });
        }
        
        // 监听开关变化
        toggle.addEventListener('change', async () => {
            try {
                await chrome.storage.sync.set({ sidebarEnabled: toggle.checked });
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    await chrome.tabs.sendMessage(tab.id, { 
                        type: 'toggleSidebar', 
                        enabled: toggle.checked 
                    });
                }
            } catch (error) {
                console.error('Error toggling sidebar:', error);
            }
        });
        
        // 监听保存按钮点击
        saveButton.addEventListener('click', async () => {
            try {
                await chrome.storage.sync.set({
                    difyApiEndpoint: apiEndpoint.value.trim(),
                    difyApiKey: apiKey.value.trim()
                });
                
                // 显示保存成功提示
                saveButton.textContent = '保存成功！';
                saveButton.style.backgroundColor = '#45a049';
                
                // 2秒后恢复按钮文字
                setTimeout(() => {
                    saveButton.textContent = '保存配置';
                    saveButton.style.backgroundColor = '#4CAF50';
                }, 2000);
            } catch (error) {
                console.error('Error saving configuration:', error);
                saveButton.textContent = '保存失败';
                saveButton.style.backgroundColor = '#f44336';
            }
        });
        
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
});