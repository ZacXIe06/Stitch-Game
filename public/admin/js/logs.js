// 日志存储
let allLogs = [];
let apiLogs = [];
let errorLogs = [];
let authLogs = []; // 新增认证日志类别

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化日志页面
    initLogsPage();
    
    // 从localStorage加载日志
    loadLogsFromStorage();
    
    // 更新日志显示
    updateAllLogsDisplay();
    
    // 检查当前认证状态并记录
    checkAndLogAuthStatus();
});

// 检查并记录认证状态
function checkAndLogAuthStatus() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        try {
            // 解析JWT令牌（不验证签名）
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                addLog('error', '认证令牌格式错误: JWT格式应为三部分（header.payload.signature）', 'auth');
                addLog('error', `当前令牌: ${token.substring(0, 10)}...`, 'auth');
                return;
            }
            
            try {
                const header = JSON.parse(atob(tokenParts[0]));
                addLog('info', `令牌头部信息: ${JSON.stringify(header)}`, 'auth');
            } catch (e) {
                addLog('error', `解析令牌头部失败: ${e.message}`, 'auth');
                addLog('error', `头部原始数据: ${tokenParts[0]}`, 'auth');
            }
            
            try {
                const payload = JSON.parse(atob(tokenParts[1]));
                const expDate = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : '未知';
                addLog('info', `令牌有效期至: ${expDate}`, 'auth');
                
                // 检查令牌是否过期
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    addLog('warn', '令牌已过期', 'auth');
                    addLog('info', `过期时间: ${expDate}`, 'auth');
                    addLog('info', `当前时间: ${new Date().toLocaleString()}`, 'auth');
                } else {
                    addLog('info', '令牌有效', 'auth');
                }
                
                // 记录用户信息
                if (payload.userId) {
                    addLog('info', `用户ID: ${payload.userId}`, 'auth');
                }
                if (payload.role) {
                    addLog('info', `用户角色: ${payload.role}`, 'auth');
                }
                
                // 记录完整的payload
                addLog('info', `完整载荷: ${JSON.stringify(payload, null, 2)}`, 'auth');
            } catch (e) {
                addLog('error', `解析令牌载荷失败: ${e.message}`, 'auth');
                addLog('error', `载荷原始数据: ${tokenParts[1]}`, 'auth');
                
                // 尝试检查Base64格式
                try {
                    const decoded = atob(tokenParts[1]);
                    addLog('info', `Base64解码成功，但JSON解析失败`, 'auth');
                } catch (e2) {
                    addLog('error', `Base64解码失败: ${e2.message}，可能不是有效的Base64格式`, 'auth');
                }
            }
            
            // 检查签名部分
            if (!tokenParts[2] || tokenParts[2].trim() === '') {
                addLog('error', '令牌签名部分为空', 'auth');
            } else {
                addLog('info', `签名部分存在 (长度: ${tokenParts[2].length})`, 'auth');
            }
        } catch (error) {
            addLog('error', `令牌解析失败: ${error.message}`, 'auth');
            addLog('error', `当前令牌: ${token.substring(0, 10)}...`, 'auth');
        }
    } else {
        addLog('warn', '未找到认证令牌', 'auth');
        
        // 检查其他可能的存储位置
        const altToken = localStorage.getItem('authToken');
        if (altToken) {
            addLog('warn', '在authToken键中找到令牌，但应该使用adminToken', 'auth');
        }
        
        // 检查会话存储
        const sessionToken = sessionStorage.getItem('adminToken');
        if (sessionToken) {
            addLog('warn', '在sessionStorage中找到令牌，但应该使用localStorage', 'auth');
        }
    }
    
    // 检查当前页面路径
    addLog('info', `当前页面路径: ${window.location.pathname}`, 'auth');
}

// 初始化日志页面
function initLogsPage() {
    // 清除日志按钮
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', function() {
            clearAllLogs();
            showAlert('日志已清除', 'success');
        });
    }
    
    // 刷新日志按钮
    const refreshLogsBtn = document.getElementById('refresh-logs-btn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', function() {
            loadLogsFromStorage();
            updateAllLogsDisplay();
            showAlert('日志已刷新', 'success');
        });
    }
    
    // API测试按钮
    const testApiBtn = document.getElementById('test-api-btn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', testApi);
    }
    
    // 重新加载仪表盘按钮
    const reloadDashboardBtn = document.getElementById('reload-dashboard-btn');
    if (reloadDashboardBtn) {
        reloadDashboardBtn.addEventListener('click', function() {
            testApi('/admin/dashboard', 'GET');
        });
    }
    
    // 检查认证按钮
    const checkAuthBtn = document.getElementById('check-auth-btn');
    if (checkAuthBtn) {
        checkAuthBtn.addEventListener('click', function() {
            checkAndLogAuthStatus();
            showAlert('已检查认证状态', 'info');
        });
    }
    
    // 修复认证按钮
    const fixAuthBtn = document.getElementById('fix-auth-btn');
    if (fixAuthBtn) {
        fixAuthBtn.addEventListener('click', function() {
            fixAuthentication();
        });
    }
    
    // 添加认证日志标签页
    addAuthLogsTab();
}

// 修复认证问题
function fixAuthentication() {
    addLog('info', '开始修复认证问题...', 'auth');
    
    // 清除所有可能的令牌存储
    localStorage.removeItem('adminToken');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('authToken');
    
    addLog('info', '已清除所有存储的令牌', 'auth');
    
    // 显示确认对话框
    if (confirm('认证数据已重置。是否重新加载页面？')) {
        addLog('info', '用户确认重新加载页面', 'auth');
        // 重新加载页面
        window.location.reload();
    } else {
        addLog('info', '用户取消重新加载页面', 'auth');
        showAlert('认证数据已重置，请手动刷新页面或重新登录', 'warning');
    }
}

// 添加认证日志标签页
function addAuthLogsTab() {
    // 检查是否已存在
    if (document.getElementById('auth-logs-tab')) {
        return;
    }
    
    // 添加标签
    const tabsContainer = document.getElementById('log-tabs');
    if (tabsContainer) {
        const authTab = document.createElement('li');
        authTab.className = 'nav-item';
        authTab.innerHTML = `<a class="nav-link" id="auth-logs-tab" data-bs-toggle="tab" href="#auth-logs">认证日志</a>`;
        tabsContainer.appendChild(authTab);
        
        // 添加内容面板
        const tabContent = document.querySelector('.tab-content');
        if (tabContent) {
            const authPane = document.createElement('div');
            authPane.className = 'tab-pane fade';
            authPane.id = 'auth-logs';
            authPane.innerHTML = `
                <div id="auth-logs-container" style="max-height: 500px; overflow-y: auto;">
                    <pre id="auth-logs-output" class="bg-dark text-light p-3 rounded" style="font-size: 14px;"></pre>
                </div>
            `;
            tabContent.appendChild(authPane);
        }
    }
}

// 从localStorage加载日志
function loadLogsFromStorage() {
    try {
        const storedLogs = localStorage.getItem('adminLogs');
        if (storedLogs) {
            allLogs = JSON.parse(storedLogs);
            
            // 过滤各类日志
            apiLogs = allLogs.filter(log => 
                log.message.includes('API请求') || 
                log.message.includes('API响应') || 
                log.message.includes('API错误')
            );
            
            errorLogs = allLogs.filter(log => log.type === 'error');
            
            authLogs = allLogs.filter(log => log.category === 'auth');
        }
    } catch (error) {
        console.error('加载日志失败:', error);
        allLogs = [];
        apiLogs = [];
        errorLogs = [];
        authLogs = [];
    }
}

// 更新所有日志显示
function updateAllLogsDisplay() {
    // 更新全部日志
    const logsOutput = document.getElementById('logs-output');
    if (logsOutput) {
        if (allLogs.length === 0) {
            logsOutput.innerHTML = '<div class="text-muted">暂无日志</div>';
        } else {
            logsOutput.innerHTML = formatLogs(allLogs);
        }
    }
    
    // 更新错误日志
    const errorLogsOutput = document.getElementById('error-logs-output');
    if (errorLogsOutput) {
        if (errorLogs.length === 0) {
            errorLogsOutput.innerHTML = '<div class="text-muted">暂无错误日志</div>';
        } else {
            errorLogsOutput.innerHTML = formatLogs(errorLogs);
        }
    }
    
    // 更新API日志
    const apiLogsOutput = document.getElementById('api-logs-output');
    if (apiLogsOutput) {
        if (apiLogs.length === 0) {
            apiLogsOutput.innerHTML = '<div class="text-muted">暂无API日志</div>';
        } else {
            apiLogsOutput.innerHTML = formatLogs(apiLogs);
        }
    }
    
    // 更新认证日志
    const authLogsOutput = document.getElementById('auth-logs-output');
    if (authLogsOutput) {
        if (authLogs.length === 0) {
            authLogsOutput.innerHTML = '<div class="text-muted">暂无认证日志</div>';
        } else {
            authLogsOutput.innerHTML = formatLogs(authLogs);
        }
    }
}

// 格式化日志
function formatLogs(logs) {
    return logs.map(log => {
        let color = '';
        switch (log.type) {
            case 'error':
                color = 'color: #ff5252;';
                break;
            case 'warn':
                color = 'color: #ffab40;';
                break;
            case 'info':
                color = 'color: #40c4ff;';
                break;
            default:
                color = 'color: #ffffff;';
        }
        return `<div style="${color}">[${log.time}] [${log.type.toUpperCase()}] ${log.message}</div>`;
    }).join('');
}

// 清除所有日志
function clearAllLogs() {
    allLogs = [];
    apiLogs = [];
    errorLogs = [];
    authLogs = [];
    localStorage.removeItem('adminLogs');
    updateAllLogsDisplay();
}

// 添加日志
function addLog(type, message, category = '') {
    const log = {
        type,
        time: new Date().toLocaleTimeString(),
        message,
        category
    };
    
    allLogs.push(log);
    
    // 分类日志
    if (type === 'error') {
        errorLogs.push(log);
    }
    
    if (message.includes('API请求') || message.includes('API响应') || message.includes('API错误')) {
        apiLogs.push(log);
    }
    
    if (category === 'auth') {
        authLogs.push(log);
    }
    
    // 保存到localStorage
    try {
        localStorage.setItem('adminLogs', JSON.stringify(allLogs));
    } catch (error) {
        console.error('保存日志失败:', error);
    }
    
    // 更新显示
    updateAllLogsDisplay();
}

// 测试API
async function testApi(endpoint, method, data) {
    // 如果没有提供参数，则从表单获取
    if (!endpoint) {
        endpoint = document.getElementById('test-endpoint').value;
    }
    
    if (!method) {
        method = document.getElementById('test-method').value;
    }
    
    if (!data && method !== 'GET') {
        const dataStr = document.getElementById('test-data').value;
        if (dataStr) {
            try {
                data = JSON.parse(dataStr);
            } catch (e) {
                addLog('error', `解析JSON数据失败: ${e.message}`);
                showAlert('解析JSON数据失败: ' + e.message, 'danger');
                return;
            }
        }
    }
    
    addLog('info', `测试API: ${method} ${endpoint}`);
    if (data) {
        addLog('info', `请求数据: ${JSON.stringify(data)}`);
    }
    
    const apiResponseElement = document.getElementById('api-response');
    if (apiResponseElement) {
        apiResponseElement.innerHTML = '请求中...';
    }
    
    try {
        const result = await apiRequest(endpoint, method, data);
        
        addLog('info', `API测试成功: ${JSON.stringify(result, null, 2)}`);
        showAlert('API测试成功', 'success');
        
        if (apiResponseElement) {
            apiResponseElement.innerHTML = JSON.stringify(result, null, 2);
        }
    } catch (error) {
        addLog('error', `API测试失败: ${error.message}`);
        showAlert('API测试失败: ' + error.message, 'danger');
        
        if (apiResponseElement) {
            apiResponseElement.innerHTML = `错误: ${error.message}`;
        }
    }
}

// 显示提示
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // 5秒后自动关闭
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alertContainer.removeChild(alert);
        }, 150);
    }, 5000);
}

// 重写console方法，将日志保存到localStorage
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = function() {
    const message = Array.from(arguments).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    addLog('log', message);
    originalConsoleLog.apply(console, arguments);
};

console.error = function() {
    const message = Array.from(arguments).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    addLog('error', message);
    originalConsoleError.apply(console, arguments);
};

console.warn = function() {
    const message = Array.from(arguments).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    addLog('warn', message);
    originalConsoleWarn.apply(console, arguments);
};

console.info = function() {
    const message = Array.from(arguments).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    addLog('info', message);
    originalConsoleInfo.apply(console, arguments);
}; 