// API基础URL
const API_BASE_URL = 'http://localhost:3000/api';

// 全局变量
let authToken = localStorage.getItem('adminToken') || 'mock-token-for-admin';
let currentPage = 1;
let currentUser = null;
let logs = [];

// 添加全局默认图片
const defaultImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAMAAAC8EZcfAAAAWlBMVEX////29vaysrLy8vLu7u6np6fOzs7i4uK+vr7Z2dnCwsL8/Px5eXny8vLj4+NbW1s3NzcZGRkoKCgAAADe3t5ra2upqalQUFA/Pz8hISF+fn5ISEgQEBBjY2OTMQRGAAADuElEQVR4nO2b27KCMAxFCy1yv4hyfP//Mw+CgJZb23RX9jhrXmacZZuSpmkKgYODg4ODg4ODg4ODN3TNoF3NL2ikzz36Ql/UjfRZbBSVxTNKr9J/LGLhu6LFE2lctNJnYyEtXH5n6DIdTVqyWlsM9Pl+wUqe9hJVaeCbnGFoGKxHyTo0uG9jGbp7vFpv0nUB/kBKf77fsSl1wJM0qW8Y76Hu4P7Sdb2W79eiCwbDFT3yHnriogqmhsrJDj0PspBdQW1R1nI5byCwQmVVTb2BDcqrjBxpPLUEKJwPGHZvIIfCqlIXjWcmBqgKUuFEGHkWmK29GBRI0zzVQkgKVU4yxiIwXEWpZPQipPCaO0Y2SuiCUmYYRb0cSgtOJ+lzMw9FYnL8/SyvQ5nUmBnCrFy6raaLJiYG/lVgZIx5eXlGxK9nZqHCk4sJFYaYP2VkpYWi98T/xT2iFrbsH9FvWmF2cqoGF0bMn20+5vYSvOqkf0RYW/mZXNKwrj1A93CcvdU/obCWXGVTsEVXYH6i8wIiXaS4w/XwJEyFKxVqqOJu4YKmhQuwsY9YHw8OTaHfsCMVMECdmNzg/HcxQLqMJSp44P7Kh5pxeAstQRRtgIMKVHH3XK7RQc1ckPGE1kC41qUQbXSyZ28E+Iu5iQEGTJJnYv1aQsEkSNQOeJxMaXOTQFrFRpRZMh4hsMEklS3wvIdAo2hKfWqGQANp5eoQ3nwG2qg31qeNmYuIVe+JtUCUQqXRZdQBnwEX9JmTJ/Sx4V+QeAjc2C7gW+GWAlM7RdLw97EtBdaJjeL7/UBbxUcNNCM0y6cPB04/+6u5YwuFL7z9sMUPLdT9Ixt96uKjkY0+9rLcKz92W2ivdLZTCVa0ggtc4AIXuMAfFsiJOqhSR0wbOYh5GRrZyOh5rlVVm6hBIRuF5L7lFhpFlOl0uH4Z9OD9HaGHttlE51dZPQQ1NuNoU5Kyi+ELG0nNVE3dXGkfE7XMiJtuYx2w/3ixk2QMNc3ESMF4JEn7GrfQSTqcAd6VsMXFl0C+BJdgWuXnwMmgwlmyYgORQW8Tn9j1NdE7qTcKbQNaUCh0d7sZuKBw6lDioUdwIREW9KDXWe9x92kI7fZTvzSYwMv4Fw3E6MNfN2BRpYr/8wY3ChAG5tgoPJLu+6WGFyeq/qMGMPnPNXDhqwKvLvBR6TGd3qS3c/i93f1Ow+4dXsxvcHBwcHBwcHBwcHAgxTeZqyq9wtAXIgAAAABJRU5ErkJggg==';

// 添加请求头辅助函数
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': authToken
    };
}

// 页面初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定导航事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageName = this.getAttribute('data-page');
            switchPage(pageName);
        });
    });
    
    // 绑定登出按钮事件
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 绑定登录表单提交事件
    if(document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    }
    
    // 绑定移动端侧边栏切换事件
    if(document.getElementById('sidebarToggle')) {
        document.getElementById('sidebarToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('show');
        });
    }
    
    // 绑定系统设置表单提交事件
    if(document.getElementById('basic-settings-form')) {
        document.getElementById('basic-settings-form').addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
    }
    
    // 初始化图表
    if(document.getElementById('userActivityChart')) {
        initializeCharts();
    }
    
    console.log('管理后台加载完成');
    
    // 添加固定的图片测试区域，不依赖API
    const testPictures = [
        {
            _id: '1',
            title: '测试图片1',
            imageUrl: '/uploads/1738563072239-蛇红包.png',
            status: 'active',
            tags: ['new'],
            difficulty: 'easy',
            completedCount: 120,
            category: { name: '动物世界' }
        },
        {
            _id: '2',
            title: '测试图片2',
            imageUrl: '/uploads/1738574445198-可爱幽灵 (2).png',
            status: 'active',
            tags: ['rare'],
            difficulty: 'medium',
            completedCount: 85,
            category: { name: '风景名胜' }
        },
        {
            _id: '3',
            title: '测试图片3',
            imageUrl: '/uploads/1738587392287-彩色骷髅头.png',
            status: 'active',
            tags: ['limited', 'hot'],
            difficulty: 'hard',
            completedCount: 210,
            category: { name: '花卉植物' }
        }
    ];

    // 添加直接测试API的按钮
    const testContainer = document.createElement('div');
    testContainer.className = 'card mb-4 mt-4';
    testContainer.innerHTML = `
        <div class="card-header bg-primary text-white">
            图片加载测试面板
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <button id="testRenderBtn" class="btn btn-success">测试直接渲染</button>
                    <button id="testApiBtn" class="btn btn-info ms-2">测试API连接</button>
                </div>
                <div class="col-md-6">
                    <div id="testStatus" class="alert alert-secondary">点击按钮进行测试</div>
                </div>
            </div>
            <div id="testImageContainer" class="row mt-3"></div>
        </div>
    `;
    
    // 检查是否在图片页面
    if (document.getElementById('pictures-page')) {
        document.getElementById('pictures-page').prepend(testContainer);
        
        // 测试直接渲染按钮
        document.getElementById('testRenderBtn').addEventListener('click', function() {
            document.getElementById('testStatus').className = 'alert alert-info';
            document.getElementById('testStatus').textContent = '正在测试直接渲染...';
            
            try {
                const container = document.getElementById('testImageContainer');
                if (!container) {
                    throw new Error('找不到testImageContainer元素');
                }
                
                container.innerHTML = '';
                
                testPictures.forEach(pic => {
                    const div = document.createElement('div');
                    div.className = 'col-md-4 mb-3';
                    div.innerHTML = `
                        <div class="card">
                            <div class="card-header">${pic.title}</div>
                            <div class="card-body text-center">
                                <img src="${pic.imageUrl}" alt="${pic.title}" class="img-fluid" 
                                    style="max-height: 150px;" 
                                    onerror="this.onerror=null; this.src='${defaultImage}'; console.log('图片加载失败:${pic.title}');"
                                    onload="console.log('图片加载成功:${pic.title}');">
                                <div class="mt-2">
                                    <span class="badge bg-success">${pic.status}</span>
                                    ${pic.tags.map(tag => `<span class="badge bg-info ms-1">${tag}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                    container.appendChild(div);
                });
                
                document.getElementById('testStatus').className = 'alert alert-success';
                document.getElementById('testStatus').textContent = '直接渲染测试完成';
            } catch (error) {
                console.error('测试渲染错误:', error);
                document.getElementById('testStatus').className = 'alert alert-danger';
                document.getElementById('testStatus').textContent = '渲染测试失败: ' + error.message;
            }
        });
        
        // 测试API连接按钮
        document.getElementById('testApiBtn').addEventListener('click', function() {
            document.getElementById('testStatus').className = 'alert alert-info';
            document.getElementById('testStatus').textContent = '正在测试API连接...';
            
            fetch('http://localhost:3000/api/admin/pictures', {
                method: 'GET',
                headers: getAuthHeaders()
            })
            .then(response => {
                document.getElementById('testStatus').textContent = `API响应状态: ${response.status} ${response.statusText}`;
                return response.json();
            })
            .then(data => {
                console.log('API返回数据:', data);
                document.getElementById('testStatus').className = 'alert alert-success';
                document.getElementById('testStatus').textContent += ' (数据获取成功)';
            })
            .catch(error => {
                console.error('API测试错误:', error);
                document.getElementById('testStatus').className = 'alert alert-danger';
                document.getElementById('testStatus').textContent = 'API测试失败: ' + error.message;
            });
        });
    }

    // 检查系统状态
    checkSystemStatus();
    
    // 每60秒自动刷新一次状态
    setInterval(checkSystemStatus, 60000);
});

// 重写console.log等方法，将日志保存到logs数组
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = function() {
    logs.push({
        type: 'log',
        time: new Date().toLocaleTimeString(),
        message: Array.from(arguments).map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg      
        ).join(' ')
    });
    updateLogsDisplay();
    originalConsoleLog.apply(console, arguments);
};

console.error = function() {
    logs.push({
        type: 'error',
        time: new Date().toLocaleTimeString(),
        message: Array.from(arguments).map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg      
        ).join(' ')
    });
    updateLogsDisplay();
    originalConsoleError.apply(console, arguments);
};

console.warn = function() {
    logs.push({
        type: 'warn',
        time: new Date().toLocaleTimeString(),
        message: Array.from(arguments).map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg      
        ).join(' ')
    });
    updateLogsDisplay();
    originalConsoleWarn.apply(console, arguments);
};

console.info = function() {
    logs.push({
        type: 'info',
        time: new Date().toLocaleTimeString(),
        message: Array.from(arguments).map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg      
        ).join(' ')
    });
    updateLogsDisplay();
    originalConsoleInfo.apply(console, arguments);
};

// 更新日志显示
function updateLogsDisplay() {
    // 如果当前在日志页面，则更新显示
    if (document.getElementById('logs-page') && document.getElementById('logs-page').classList.contains('active')) {
        renderLogs(logs);
    }
}

// 检查登录状态
function checkLoginStatus() {
    if (!authToken) {
        // 没有登录，显示登录模态框
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    } else {
        // 已登录，加载仪表盘数据
        loadDashboardData();
    }
}

// 处理登录
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 简单模拟登录成功
    if (username === 'admin' && password === 'admin123') {
        authToken = 'mock-token-for-admin';
        localStorage.setItem('adminToken', authToken);
        
        // 隐藏登录模态框
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        // 加载仪表盘数据
        loadDashboardData();
        
        // 显示成功提示
        showToast('登录成功', 'success');
    } else {
        // 显示错误消息
        document.getElementById('loginError').classList.remove('d-none');
        document.getElementById('loginError').textContent = '用户名或密码错误';
    }
}

// 登出
function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    window.location.reload();
}

// 切换页面函数
function switchPage(pageName) {
    // 更新导航高亮
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.nav-link[data-page="${pageName}"]`).classList.add('active');
    
    // 隐藏所有页面
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示选中页面
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // 加载页面数据
    if(pageName === 'dashboard') {
        loadDashboardData();
    } else if(pageName === 'users') {
        loadUsers();
    } else if(pageName === 'pictures') {
        loadPictures();
    } else if(pageName === 'logs') {
        loadLogs();
    } else if(pageName === 'settings') {
        loadSettings();
    } else if(pageName === 'banners') {
        loadBanners();
    }
}

// 加载仪表盘数据
function loadDashboardData() {
    showLoading();
    
    // 使用模拟数据进行测试
    const mockData = {
        totalUsers: 150,
        totalPictures: 45,
        totalCategories: 8,
        activeUsers: 89
    };
    
    try {
        // 填充数据
        document.getElementById('total-users').textContent = mockData.totalUsers;
        document.getElementById('total-pictures').textContent = mockData.totalPictures;
        document.getElementById('total-categories').textContent = mockData.totalCategories;
        document.getElementById('active-users').textContent = mockData.activeUsers;
        
        hideLoading();
        showToast('仪表盘数据加载成功', 'success');
    } catch (error) {
        console.error('加载仪表盘数据错误:', error);
        
        // 出错时显示0
        document.getElementById('total-users').textContent = '0';
        document.getElementById('total-pictures').textContent = '0';
        document.getElementById('total-categories').textContent = '0';
        document.getElementById('active-users').textContent = '0';
        
        hideLoading();
        showToast('加载仪表盘数据失败', 'error');
    }
}

// 加载用户数据
function loadUsers() {
    showLoading();
    
    // 使用模拟数据进行测试
    const mockUsers = [
        {
            _id: '1',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            status: 'active',
            createdAt: '2024-03-26 10:00:00',
            lastLogin: '2024-03-26 16:30:00',
            completedPictures: 25
        },
        {
            _id: '2',
            username: 'user1',
            email: 'user1@example.com',
            role: 'user',
            status: 'active',
            createdAt: '2024-03-25 14:20:00',
            lastLogin: '2024-03-26 15:45:00',
            completedPictures: 12
        },
        {
            _id: '3',
            username: 'user2',
            email: 'user2@example.com',
            role: 'user',
            status: 'inactive',
            createdAt: '2024-03-24 09:15:00',
            lastLogin: '2024-03-25 11:20:00',
            completedPictures: 8
        }
    ];

    try {
        // 渲染用户列表
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) {
            throw new Error('找不到users-table-body元素');
        }

        if (!mockUsers || mockUsers.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">暂无用户数据</td></tr>';
            hideLoading();
            return;
        }

        let html = '';
        mockUsers.forEach(user => {
            html += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                            ${user.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${user.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                            ${user.status === 'active' ? '已启用' : '已禁用'}
                        </span>
                    </td>
                    <td>${user.createdAt}</td>
                    <td>${user.lastLogin}</td>
                    <td>${user.completedPictures}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary edit-user-btn" data-id="${user._id}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-user-btn" data-id="${user._id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        usersTableBody.innerHTML = html;
        
        // 绑定用户相关事件
        bindUserEvents();
        
        hideLoading();
        showToast('用户数据加载成功', 'success');
    } catch (error) {
        console.error('加载用户数据错误:', error);
        const usersTableBody = document.getElementById('users-table-body');
        if (usersTableBody) {
            usersTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">加载用户数据失败: ' + error.message + '</td></tr>';
        }
        
        hideLoading();
        showToast('加载用户数据失败: ' + error.message, 'error');
    }
}

// 绑定用户相关事件
function bindUserEvents() {
    // 绑定编辑按钮事件
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });

    // 绑定删除按钮事件
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            deleteUser(userId);
        });
    });

    // 绑定搜索框事件
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            const rows = document.querySelectorAll('#users-table-body tr');
            
            rows.forEach(row => {
                const username = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
                const email = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
                
                if (username.includes(searchText) || email.includes(searchText)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

// 编辑用户
function editUser(userId) {
    // 模拟获取用户数据
    const mockUser = {
        _id: userId,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active'
    };

    try {
        // 填充表单
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.reset();
        }

        const userIdInput = document.getElementById('userId');
        if (userIdInput) {
            userIdInput.value = mockUser._id;
        }

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = mockUser.username;
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = mockUser.email;
        }

        const roleSelect = document.getElementById('userRole');
        if (roleSelect) {
            roleSelect.value = mockUser.role;
        }

        const statusSelect = document.getElementById('userStatus');
        if (statusSelect) {
            statusSelect.value = mockUser.status;
        }

        // 更新模态框标题
        const modalTitle = document.getElementById('userModalTitle');
        if (modalTitle) {
            modalTitle.textContent = '编辑用户';
        }

        // 显示模态框
        const userModal = document.getElementById('userModal');
        if (userModal) {
            const modal = new bootstrap.Modal(userModal);
            modal.show();
        }
    } catch (error) {
        console.error('编辑用户错误:', error);
        showToast('编辑用户失败: ' + error.message, 'error');
    }
}

// 删除用户
function deleteUser(userId) {
    if (confirm('确定要删除这个用户吗？此操作不可恢复！')) {
        try {
            // 从DOM中移除对应的行
            const row = document.querySelector(`#users-table-body tr button[data-id="${userId}"]`)?.closest('tr');
            if (row) {
                row.remove();
                showToast('用户删除成功', 'success');
            } else {
                throw new Error('找不到要删除的用户行');
            }
        } catch (error) {
            console.error('删除用户错误:', error);
            showToast('删除用户失败: ' + error.message, 'error');
        }
    }
}

// 保存用户
function saveUser() {
    try {
        // 获取表单数据
        const userId = document.getElementById('userId')?.value;
        const username = document.getElementById('username')?.value;
        const email = document.getElementById('email')?.value;
        const role = document.getElementById('userRole')?.value;
        const status = document.getElementById('userStatus')?.value;

        // 验证必填字段
        if (!username) {
            throw new Error('请输入用户名');
        }

        if (!email) {
            throw new Error('请输入邮箱');
        }

        if (!role) {
            throw new Error('请选择用户角色');
        }

        if (!status) {
            throw new Error('请选择用户状态');
        }

        // 模拟保存成功
        showToast('用户保存成功', 'success');

        // 关闭模态框
        const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        if (userModal) {
            userModal.hide();
        }

        // 重新加载用户列表
        loadUsers();
    } catch (error) {
        console.error('保存用户错误:', error);
        showToast('保存用户失败: ' + error.message, 'error');
    }
}

// 加载图片数据
function loadPictures() {
    console.log('开始加载图片数据');
    const container = document.getElementById('pictures-container');
    
    if (!container) {
        console.error('找不到pictures-container元素');
        return;
    }
    
    showLoading();
    container.innerHTML = '<div class="alert alert-info">正在加载图片数据...</div>';
    
    // 伪造数据用于测试UI
    const mockData = {
        pictures: [
            {
                _id: '1',
                title: '测试图片1',
                description: '这是一个测试图片',
                imageUrl: '/uploads/1738563072239-蛇红包.png',
                status: 'active',
                tags: ['new', 'hot'],
                difficulty: 'easy',
                position: 1,
                category: { name: '测试分类' },
                completedCount: 120
            },
            {
                _id: '2', 
                title: '测试图片2',
                description: '这是第二个测试图片',
                imageUrl: '/uploads/1738574882733-可爱幽灵 (2).png',
                status: 'active',
                tags: ['rare', 'limited'],
                difficulty: 'medium',
                position: 2,
                category: { name: '风景' },
                completedCount: 85
            }
        ],
        pagination: {
            total: 2,
            page: 1,
            pages: 1
        }
    };
    
    try {
        console.log('使用模拟数据渲染');
        renderPictures(mockData.pictures, mockData.pagination);
        bindPictureEvents();
        hideLoading();
        showToast('图片数据加载成功', 'success');
    } catch (error) {
        console.error('渲染图片时发生错误:', error);
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">渲染图片失败: ${error.message}</div>`;
        }
        hideLoading();
        showToast('渲染图片失败', 'error');
    }
}

// 渲染图片列表
function renderPictures(pictures, pagination) {
    const container = document.getElementById('pictures-container');
    if (!container) {
        throw new Error('找不到pictures-container元素');
    }

    if (!pictures || pictures.length === 0) {
        container.innerHTML = '<div class="alert alert-info">暂无图片数据</div>';
        return;
    }

    let html = `
        <table class="table table-striped table-bordered">
            <thead>
                <tr>
                    <th>排序</th>
                    <th>缩略图</th>
                    <th>标题</th>
                    <th>分类</th>
                    <th>标签</th>
                    <th>稀有度</th>
                    <th>状态</th>
                    <th>完成次数</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    pictures.forEach(picture => {
        const tagHtml = (picture.tags || []).map(tag => {
            const badgeClass = tag === 'new' ? 'bg-info' :
                             tag === 'rare' ? 'bg-warning' :
                             tag === 'limited' ? 'bg-danger' :
                             tag === 'hot' ? 'bg-primary' : 'bg-secondary';
            return `<span class="badge ${badgeClass} me-1">${tag}</span>`;
        }).join('');

        html += `
            <tr>
                <td>${picture.position || '-'}</td>
                <td>
                    <img src="${picture.imageUrl}" alt="${picture.title}" class="img-thumbnail" style="max-height: 80px;"
                        onerror="this.src='${defaultImage}'; console.log('图片加载失败:${picture.title}');"
                        onload="console.log('图片加载成功:${picture.title}');">
                </td>
                <td>${picture.title}</td>
                <td>${picture.category?.name || '-'}</td>
                <td>${tagHtml}</td>
                <td>${picture.difficulty || '普通'}</td>
                <td>
                    <span class="badge ${picture.status === 'active' ? 'bg-success' : 'bg-danger'}">
                        ${picture.status === 'active' ? '已启用' : '已禁用'}
                    </span>
                </td>
                <td>${picture.completedCount || 0}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-picture-btn" data-id="${picture._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-picture-btn" data-id="${picture._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// 绑定图片相关事件
function bindPictureEvents() {
    document.querySelectorAll('.edit-picture-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const pictureId = this.dataset.id;
            // TODO: 实现编辑功能
            console.log('编辑图片:', pictureId);
        });
    });

    document.querySelectorAll('.delete-picture-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const pictureId = this.dataset.id;
            // TODO: 实现删除功能
            console.log('删除图片:', pictureId);
        });
    });
}

// 查看图片
function viewPicture(pictureId) {
    showLoading();
    
    fetch(`${API_BASE_URL}/admin/pictures/${pictureId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取图片详情失败');
        }
        return response.json();
    })
    .then(picture => {
        // 在新窗口中打开图片
        if (picture.imageUrl) {
            // 使用直接路径
            window.open(picture.imageUrl, '_blank');
        } else {
            showToast('图片链接不存在', 'error');
        }
        
        hideLoading();
    })
    .catch(error => {
        console.error('获取图片详情错误:', error);
        hideLoading();
        showToast('获取图片详情失败', 'error');
    });
}

// 编辑图片
function editPicture(pictureId) {
    showLoading();
    
    fetch(`${API_BASE_URL}/admin/pictures/${pictureId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取图片详情失败');
        }
        return response.json();
    })
    .then(picture => {
        // 填充表单
        document.getElementById('pictureId').value = picture._id;
        document.getElementById('pictureTitle').value = picture.title || '';
        document.getElementById('pictureDescription').value = picture.description || '';
        document.getElementById('picturePosition').value = picture.position || 0;
        
        if (picture.status === 'active') {
            document.getElementById('pictureStatusActive').checked = true;
        } else {
            document.getElementById('pictureStatusInactive').checked = true;
        }
        
        // 设置标签
        document.getElementById('tagNew').checked = picture.tags && picture.tags.includes('new');
        document.getElementById('tagHot').checked = picture.tags && picture.tags.includes('hot');
        document.getElementById('tagRare').checked = picture.tags && picture.tags.includes('rare');
        document.getElementById('tagLimited').checked = picture.tags && picture.tags.includes('limited');
        
        // 显示预览
        if (picture.imageUrl) {
            // 直接使用图片路径
            document.getElementById('picturePreview').src = picture.imageUrl;
            document.getElementById('picturePreviewContainer').classList.remove('d-none');
        } else {
            document.getElementById('picturePreviewContainer').classList.add('d-none');
        }
        
        // 设置模态框标题
        document.getElementById('pictureModalTitle').textContent = '编辑图片';
        
        // 显示模态框
        const pictureModal = new bootstrap.Modal(document.getElementById('pictureModal'));
        pictureModal.show();
        
        hideLoading();
    })
    .catch(error => {
        console.error('获取图片详情错误:', error);
        hideLoading();
        showToast('获取图片详情失败', 'error');
    });
}

// 删除图片
function deletePicture(pictureId) {
    if (confirm('确定要删除此图片吗？')) {
        showLoading();
        
        fetch(`${API_BASE_URL}/admin/pictures/${pictureId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除图片失败');
            }
            return response.json();
        })
        .then(data => {
            showToast('图片删除成功', 'success');
            
            // 重新加载数据
            loadPictures();
            
            hideLoading();
        })
        .catch(error => {
            console.error('删除图片错误:', error);
            showToast('删除图片失败', 'error');
            hideLoading();
        });
    }
}

// 保存图片数据
function savePicture() {
    // 获取表单数据
    const pictureId = document.getElementById('pictureId').value;
    const pictureTitle = document.getElementById('pictureTitle').value;
    const pictureDescription = document.getElementById('pictureDescription').value;
    const picturePosition = document.getElementById('picturePosition').value;
    const pictureStatus = document.querySelector('input[name="pictureStatus"]:checked').value;
    
    // 获取标签
    const tags = [];
    if (document.getElementById('tagNew').checked) tags.push('new');
    if (document.getElementById('tagHot').checked) tags.push('hot');
    if (document.getElementById('tagRare').checked) tags.push('rare');
    if (document.getElementById('tagLimited').checked) tags.push('limited');
    
    // 此处可以添加表单验证
    if (!pictureTitle) {
        showToast('请输入图片标题', 'error');
        return;
    }
    
    showLoading();
    
    const formData = new FormData();
    formData.append('title', pictureTitle);
    formData.append('description', pictureDescription);
    formData.append('position', picturePosition);
    formData.append('status', pictureStatus);
    formData.append('tags', tags.join(','));
    
    if (document.getElementById('pictureImage').files.length > 0) {
        formData.append('image', document.getElementById('pictureImage').files[0]);
    }
    
    const url = pictureId ? `${API_BASE_URL}/admin/pictures/${pictureId}` : `${API_BASE_URL}/admin/pictures`;
    const method = pictureId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('保存图片失败');
        }
        return response.json();
    })
    .then(data => {
        showToast('图片保存成功', 'success');
        
        // 关闭模态框
        const pictureModal = bootstrap.Modal.getInstance(document.getElementById('pictureModal'));
        pictureModal.hide();
        
        // 重新加载数据
        loadPictures();
        
        hideLoading();
    })
    .catch(error => {
        console.error('保存图片错误:', error);
        showToast('保存图片失败', 'error');
        hideLoading();
    });
}

// 加载系统日志数据
function loadLogs() {
    // 此处可以通过API获取真实日志数据
    // 目前使用静态数据进行展示
    
    showToast('系统日志加载成功', 'success');
    
    // 如果有实际API，可以使用以下代码
    /*
    showLoading();
    
    fetch(`${API_BASE_URL}/admin/logs`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取日志失败');
        }
        return response.json();
    })
    .then(data => {
        renderLogs(data);
        hideLoading();
    })
    .catch(error => {
        console.error('加载日志错误:', error);
        showToast('加载日志失败', 'error');
        hideLoading();
    });
    */
    
    // 示例日志数据
    const exampleLogs = [
        {
            timestamp: '2024-03-26 16:30:45',
            user: 'admin',
            action: '登录',
            details: '用户登录成功',
            ip: '127.0.0.1',
            status: 'success'
        },
        {
            timestamp: '2024-03-26 16:35:12',
            user: 'admin',
            action: '图片上传',
            details: '上传新图片"春日风景"',
            ip: '127.0.0.1',
            status: 'success'
        },
        {
            timestamp: '2024-03-26 16:40:23',
            user: 'admin',
            action: '分类管理',
            details: '创建新分类"动物世界"',
            ip: '127.0.0.1',
            status: 'success'
        },
        {
            timestamp: '2024-03-26 16:42:47',
            user: 'system',
            action: '系统通知',
            details: '数据库自动备份',
            ip: '-',
            status: 'info'
        },
        {
            timestamp: '2024-03-26 16:45:18',
            user: 'admin',
            action: '用户管理',
            details: '修改用户"user123"的权限',
            ip: '127.0.0.1',
            status: 'success'
        }
    ];
    
    renderLogs(exampleLogs);
}

// 渲染日志数据
function renderLogs(logs) {
    const logsTableBody = document.getElementById('logs-table-body');
    
    if (logs && logs.length > 0) {
        let html = '';
        
        logs.forEach(log => {
            html += `
                <tr>
                    <td>${log.timestamp}</td>
                    <td>${log.user}</td>
                    <td>${log.action}</td>
                    <td>${log.details}</td>
                    <td>${log.ip}</td>
                    <td><span class="badge bg-${log.status === 'success' ? 'success' : log.status === 'info' ? 'info' : 'danger'}">${log.status}</span></td>
                </tr>
            `;
        });
        
        logsTableBody.innerHTML = html;
    }
}

// 加载系统设置
function loadSettings() {
    // 此处可以通过API获取实际系统设置
    // 目前使用静态数据
    
    showToast('系统设置加载成功', 'success');
    
    // 如果有实际API，可以使用以下代码
    /*
    showLoading();
    
    fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取设置失败');
        }
        return response.json();
    })
    .then(data => {
        renderSettings(data);
        hideLoading();
    })
    .catch(error => {
        console.error('加载设置错误:', error);
        showToast('加载设置失败', 'error');
        hideLoading();
    });
    */
}

// 保存系统设置
function saveSettings() {
    // 获取表单数据
    const siteName = document.getElementById('site-name').value;
    const siteDescription = document.getElementById('site-description').value;
    const contactEmail = document.getElementById('contact-email').value;
    const siteStatus = document.querySelector('input[name="site-status"]:checked').value;
    
    const settingsData = {
        siteName,
        siteDescription,
        contactEmail,
        siteStatus
    };
    
    // 显示保存成功提示
    showToast('设置保存成功', 'success');
    
    // 如果有实际API，可以使用以下代码
    /*
    showLoading();
    
    fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(settingsData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('保存设置失败');
        }
        return response.json();
    })
    .then(data => {
        showToast('设置保存成功', 'success');
        hideLoading();
    })
    .catch(error => {
        console.error('保存设置错误:', error);
        showToast('保存设置失败', 'error');
        hideLoading();
    });
    */
}

// 初始化图表
function initializeCharts() {
    // 用户活跃度图表
    const userActivityChart = document.getElementById('userActivityChart');
    
    if (userActivityChart) {
        const ctx = userActivityChart.getContext('2d');
        
        // 示例数据
        const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const data = {
            labels: labels,
            datasets: [{
                label: '活跃用户数',
                data: [12, 19, 15, 25, 22, 30, 35],
                backgroundColor: 'rgba(74, 107, 255, 0.2)',
                borderColor: 'rgba(74, 107, 255, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        };
        
        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };
        
        new Chart(ctx, config);
    }
}

// 显示加载中状态
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('d-none');
}

// 隐藏加载中状态
function hideLoading() {
    document.getElementById('loading-overlay').classList.add('d-none');
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">${type === 'success' ? '成功' : type === 'error' ? '错误' : '提示'}</strong>
            <small>刚刚</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // 3秒后自动关闭
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 加载Banner数据
function loadBanners() {
    showLoading();
    
    // 使用模拟数据进行测试
    const mockBanners = [
        {
            _id: '1',
            imageUrl: '/uploads/1738563072239-蛇红包.png',
            link: 'http://example.com/1',
            status: 'active',
            order: 1
        },
        {
            _id: '2',
            imageUrl: '/uploads/1738574882733-可爱幽灵 (2).png',
            link: 'http://example.com/2',
            status: 'active',
            order: 2
        }
    ];

    try {
        // 渲染Banner列表
        const bannersTableBody = document.getElementById('banners-table-body');
        if (!bannersTableBody) {
            throw new Error('找不到banners-table-body元素');
        }

        if (!mockBanners || mockBanners.length === 0) {
            bannersTableBody.innerHTML = '<tr><td colspan="6" class="text-center">暂无Banner数据</td></tr>';
            hideLoading();
            return;
        }

        let html = '';
        mockBanners.forEach((banner, index) => {
            html += `
                <tr>
                    <td>
                        <div class="d-flex flex-column">
                            <button class="btn btn-sm btn-light mb-1" ${index === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
                            <button class="btn btn-sm btn-light" ${index === mockBanners.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
                        </div>
                    </td>
                    <td>
                        <img src="${banner.imageUrl}" 
                            alt="Banner ${index + 1}" 
                            class="img-thumbnail" 
                            style="max-height: 80px; min-width: 150px; object-fit: cover;" 
                            onerror="if (!this.retryCount) { this.retryCount = 1; this.src = '${banner.imageUrl}'; } else { this.onerror = null; this.src = '${defaultImage}'; console.log('Banner图片加载失败，使用默认图片:', '${banner.imageUrl}'); }"
                            onload="console.log('Banner图片加载成功:', '${banner.imageUrl}');">
                    </td>
                    <td>
                        <div class="text-truncate">${banner.link || '无链接'}</div>
                    </td>
                    <td>
                        <span class="badge ${banner.status === 'active' ? 'bg-success' : 'bg-secondary'}">${banner.status === 'active' ? '已启用' : '已禁用'}</span>
                    </td>
                    <td>${banner.order || index + 1}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary edit-banner-btn" data-id="${banner._id}">编辑</button>
                            <button class="btn btn-sm btn-outline-danger delete-banner-btn" data-id="${banner._id}">删除</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        bannersTableBody.innerHTML = html;
        
        // 重新绑定事件
        bindBannerEvents();
        
        hideLoading();
        showToast('Banner数据加载成功', 'success');
    } catch (error) {
        console.error('加载Banner数据错误:', error);
        const bannersTableBody = document.getElementById('banners-table-body');
        if (bannersTableBody) {
            bannersTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">加载Banner数据失败: ' + error.message + '</td></tr>';
        }
        
        hideLoading();
        showToast('加载Banner数据失败: ' + error.message, 'error');
    }
}

// 绑定Banner事件
function bindBannerEvents() {
    // 绑定排序按钮事件
    document.querySelectorAll('#banners-table-body tr').forEach((row, index) => {
        const upButton = row.querySelector('button:first-child');
        const downButton = row.querySelector('button:last-child');
        
        if (upButton) {
            // 绑定上移事件
            upButton.addEventListener('click', function() {
                if (!upButton.disabled && index > 0) {
                    const rows = Array.from(document.querySelectorAll('#banners-table-body tr'));
                    const parentElement = row.parentElement;
                    if (parentElement) {
                        parentElement.insertBefore(row, rows[index - 1]);
                        updateBannerOrder();
                    }
                }
            });
        }
        
        if (downButton) {
            // 绑定下移事件
            downButton.addEventListener('click', function() {
                if (!downButton.disabled) {
                    const rows = Array.from(document.querySelectorAll('#banners-table-body tr'));
                    if (index < rows.length - 1) {
                        const parentElement = row.parentElement;
                        if (parentElement) {
                            parentElement.insertBefore(rows[index + 1], row);
                            updateBannerOrder();
                        }
                    }
                }
            });
        }
    });
    
    // 绑定编辑按钮事件
    document.querySelectorAll('.edit-banner-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bannerId = this.getAttribute('data-id');
            editBanner(bannerId);
        });
    });
    
    // 绑定删除按钮事件
    document.querySelectorAll('.delete-banner-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bannerId = this.getAttribute('data-id');
            deleteBanner(bannerId);
        });
    });
}

// 更新Banner排序
function updateBannerOrder() {
    const rows = Array.from(document.querySelectorAll('#banners-table-body tr'));
    rows.forEach((row, index) => {
        const orderCell = row.querySelector('td:nth-child(5)');
        if (orderCell) {
            orderCell.textContent = index + 1;
        }
        
        // 更新上下移动按钮状态
        const upButton = row.querySelector('button:first-child');
        const downButton = row.querySelector('button:last-child');
        
        if (upButton) {
            upButton.disabled = index === 0;
        }
        
        if (downButton) {
            downButton.disabled = index === rows.length - 1;
        }
    });
}

// 编辑Banner
function editBanner(bannerId) {
    try {
        // 查找对应的Banner数据
        const banner = mockBanners.find(b => b._id === bannerId);
        if (!banner) {
            throw new Error('找不到对应的Banner数据');
        }
        
        // 填充表单
        const bannerForm = document.getElementById('bannerForm');
        if (bannerForm) {
            bannerForm.reset();
        }
        
        const bannerIdInput = document.getElementById('bannerId');
        if (bannerIdInput) {
            bannerIdInput.value = banner._id;
        }
        
        const bannerLink = document.getElementById('bannerLink');
        if (bannerLink) {
            bannerLink.value = banner.link || '';
        }
        
        const bannerOrder = document.getElementById('bannerOrder');
        if (bannerOrder) {
            bannerOrder.value = banner.order || 1;
        }
        
        const bannerStatusActive = document.getElementById('bannerStatusActive');
        const bannerStatusInactive = document.getElementById('bannerStatusInactive');
        if (bannerStatusActive && bannerStatusInactive) {
            if (banner.status === 'active') {
                bannerStatusActive.checked = true;
            } else {
                bannerStatusInactive.checked = true;
            }
        }
        
        // 显示图片预览
        const preview = document.getElementById('bannerPreview');
        const previewContainer = document.getElementById('bannerPreviewContainer');
        if (preview && previewContainer && banner.imageUrl) {
            preview.src = banner.imageUrl;
            previewContainer.classList.remove('d-none');
        }
        
        // 更新模态框标题
        const modalTitle = document.getElementById('bannerModalTitle');
        if (modalTitle) {
            modalTitle.textContent = '编辑Banner';
        }
        
        // 显示模态框
        const bannerModal = document.getElementById('bannerModal');
        if (bannerModal) {
            const modal = new bootstrap.Modal(bannerModal);
            modal.show();
        }
    } catch (error) {
        console.error('编辑Banner错误:', error);
        showToast('编辑Banner失败: ' + error.message, 'error');
    }
}

// 删除Banner
function deleteBanner(bannerId) {
    if (confirm('确定要删除这个Banner吗？')) {
        try {
            // 从DOM中移除对应的行
            const row = document.querySelector(`#banners-table-body tr button[data-id="${bannerId}"]`)?.closest('tr');
            if (row) {
                row.remove();
                
                // 更新排序
                updateBannerOrder();
                
                showToast('Banner删除成功', 'success');
            } else {
                throw new Error('找不到要删除的Banner行');
            }
        } catch (error) {
            console.error('删除Banner错误:', error);
            showToast('删除Banner失败: ' + error.message, 'error');
        }
    }
}

// 保存Banner
function saveBanner() {
    try {
        // 获取表单数据
        const bannerId = document.getElementById('bannerId')?.value;
        const bannerLink = document.getElementById('bannerLink')?.value;
        const bannerOrder = document.getElementById('bannerOrder')?.value;
        const bannerStatus = document.querySelector('input[name="bannerStatus"]:checked')?.value;
        const bannerImage = document.getElementById('bannerImage')?.files[0];
        
        // 验证必填字段
        if (!bannerLink) {
            throw new Error('请输入跳转链接');
        }
        
        if (!bannerOrder || isNaN(bannerOrder)) {
            throw new Error('请输入有效的显示顺序');
        }
        
        if (!bannerStatus) {
            throw new Error('请选择Banner状态');
        }
        
        // 如果是新增且没有选择图片
        if (!bannerId && !bannerImage) {
            throw new Error('请选择Banner图片');
        }
        
        // 模拟保存成功
        showToast('Banner保存成功', 'success');
        
        // 关闭模态框
        const bannerModal = bootstrap.Modal.getInstance(document.getElementById('bannerModal'));
        if (bannerModal) {
            bannerModal.hide();
        }
        
        // 重新加载Banner列表
        loadBanners();
    } catch (error) {
        console.error('保存Banner错误:', error);
        showToast('保存Banner失败: ' + error.message, 'error');
    }
}

// 检查系统状态
async function checkSystemStatus() {
    try {
        const response = await fetch('/api/admin/check-status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}` // 添加认证token
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // 更新服务器状态
            updateStatusBadge('server-status', result.data.serverStatus);
            
            // 更新数据库状态
            updateStatusBadge('db-status', result.data.dbStatus);
            
            // 更新API状态
            updateStatusBadge('api-status', result.data.apiStatus);
            
            // 更新系统负载
            updateProgressBar('system-load', result.data.systemLoad);
            
            // 更新存储空间
            updateProgressBar('storage-space', result.data.storageSpace);
        } else {
            console.error('检查系统状态失败:', result.message);
            showToast('错误', '检查系统状态失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('检查系统状态出错:', error);
        showToast('错误', '检查系统状态出错: ' + error.message, 'error');
        
        // 在发生错误时将所有状态设置为错误状态
        updateStatusBadge('server-status', false);
        updateStatusBadge('db-status', false);
        updateStatusBadge('api-status', false);
        updateProgressBar('system-load', 0);
        updateProgressBar('storage-space', 0);
    }
}

// 更新状态徽章
function updateStatusBadge(elementId, status) {
    const badge = document.querySelector(`#${elementId} .badge`);
    if (badge) {
        badge.className = `badge ${status ? 'bg-success' : 'bg-danger'}`;
        badge.textContent = status ? '正常' : '异常';
    }
}

// 更新进度条
function updateProgressBar(elementId, value) {
    const progressBar = document.querySelector(`#${elementId} .progress-bar`);
    if (progressBar) {
        const percentage = Math.min(Math.max(value, 0), 100);
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        
        // 根据使用率设置颜色
        if (percentage > 90) {
            progressBar.className = 'progress-bar bg-danger';
        } else if (percentage > 70) {
            progressBar.className = 'progress-bar bg-warning';
        } else {
            progressBar.className = 'progress-bar bg-success';
        }
    }
}

// 获取认证token
function getToken() {
    return localStorage.getItem('token') || 'mock-token-for-admin';
}

// 页面加载完成后开始定期检查系统状态
document.addEventListener('DOMContentLoaded', () => {
    // 立即检查一次
    checkSystemStatus();
    
    // 每60秒检查一次
    setInterval(checkSystemStatus, 60000);
}); 