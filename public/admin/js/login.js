// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('登录页面加载完成');
    
    // 清除所有可能存在的令牌，避免循环跳转
    clearAllTokens();
    
    // 注册登录表单提交事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// 清除所有令牌
function clearAllTokens() {
    console.log('清除所有存储的令牌');
    
    // 清除localStorage中的令牌
    localStorage.removeItem('adminToken');
    localStorage.removeItem('authToken');
    
    // 清除sessionStorage中的令牌
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('authToken');
}

// 处理登录请求
async function handleLogin(e) {
    e.preventDefault();
    
    const usernameOrEmail = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('loginError');
    
    try {
        console.log('开始登录请求...');
        errorElement.classList.add('d-none');
        
        // 判断输入是邮箱还是用户名
        const isEmail = usernameOrEmail.includes('@');
        const loginData = isEmail 
            ? { email: usernameOrEmail, password } 
            : { username: usernameOrEmail, password };
        
        console.log('登录数据:', { ...loginData, password: '***' });
        
        // 显示加载状态
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 登录中...';
        
        // 检查服务器连接
        try {
            const pingResponse = await fetch('/api/ping', { method: 'GET' });
            console.log('服务器连接状态:', pingResponse.ok ? '正常' : '异常');
        } catch (pingError) {
            console.error('服务器连接检查失败:', pingError);
        }
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('登录响应状态:', response.status, response.statusText);
        const responseText = await response.text();
        console.log('登录响应原始数据:', responseText);
        
        // 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('登录响应解析数据:', data);
        } catch (e) {
            console.error('解析登录响应失败:', e);
            throw new Error('服务器响应格式错误，可能服务器未正常运行');
        }
        
        if (!response.ok) {
            throw new Error(data.message || data.error || '登录失败');
        }
        
        console.log('登录成功，获取令牌和用户信息');
        
        // 检查令牌是否存在
        if (!data.token) {
            console.error('登录响应中没有令牌');
            throw new Error('服务器未返回认证令牌');
        }
        
        // 跳过管理员角色检查
        console.log('跳过管理员角色检查，允许所有用户访问');
        
        /*
        // 检查是否为管理员
        if (data.user && data.user.role !== 'admin') {
            throw new Error('您没有管理员权限');
        }
        */
        
        // 保存令牌和用户信息
        const token = data.token;
        
        console.log('准备保存令牌到localStorage:', token.substring(0, 20) + '...');
        localStorage.setItem('adminToken', token);
        console.log('令牌已保存到localStorage');
        
        // 跳转到仪表盘页面
        console.log('准备跳转到仪表盘页面');
        window.location.href = '/admin/dashboard.html';
        
    } catch (error) {
        console.error('登录失败:', error);
        errorElement.textContent = error.message || '登录失败，请检查服务器是否正常运行';
        errorElement.classList.remove('d-none');
        
        // 添加更多错误信息
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorElement.textContent = '无法连接到服务器，请确认服务器是否正在运行';
        }
    }
} 