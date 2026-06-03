// 1. БАЗА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ И РОЛЕЙ
const defaultAccounts = {
    "админ": { name: "Иван Сисадмин", role: "sysadmin", pass: "root", avatar: "https://ui-avatars.com/api/?name=Admin&background=007aff&color=fff" },
    "завуч": { name: "Елена Викторовна", role: "zavuch", pass: "12345", avatar: "https://ui-avatars.com/api/?name=Zavuch&background=ff3b30&color=fff" },
    "учитель": { name: "Ольга Петровна", role: "teacher", pass: "teach575", avatar: "https://ui-avatars.com/api/?name=Teacher&background=34c759&color=fff" },
    "ученик1": { name: "Иван Иванов", role: "student", pass: "1111", avatar: "https://ui-avatars.com/api/?name=Student&background=ff9500&color=fff" }
};

// Инициализация состояний из хранилища браузера
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let accountsDB = JSON.parse(localStorage.getItem('accountsDB')) || defaultAccounts;
let bannedUsers = JSON.parse(localStorage.getItem('bannedUsers')) || [];

// 2. УПРАВЛЕНИЕ ШТОРКОЙ МЕНЮ
function openMenu() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('active');
    checkAdminPanelVisibility();
}
function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

// 3. АВТОМАТИЧЕСКАЯ НАСТРОЙКА ТЕМ ОФОРМЛЕНИЯ
function initThemeAndStyles() {
    const savedTheme = localStorage.getItem('siteDarkTheme');
    if (!savedTheme) {
        // Умная системная тема: сверяем с настройками Windows/MacOS/Android
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Подписка на изменение темы ОС в реальном времени
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('siteDarkTheme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });

    const savedStyle = localStorage.getItem('siteStyleTheme') || 'glass';
    document.documentElement.setAttribute('data-style', savedStyle);
    if(document.getElementById('themeSelector')) {
        document.getElementById('themeSelector').value = savedStyle;
    }
}

function changeStyleTheme() {
    const style = document.getElementById('themeSelector').value;
    document.documentElement.setAttribute('data-style', style);
    localStorage.setItem('siteStyleTheme', style);
}

function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('siteDarkTheme', next);
}
// 4. СИСТЕМА ВХОДА И ПРОВЕРКИ ПРАВ
function loginUser() {
    const login = document.getElementById('loginName').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    
    if (bannedUsers.includes(login)) {
        alert("Внимание! Ваш аккаунт ЗАБЛОКИРОВАН администрацией школы.");
        return;
    }
    
    const user = accountsDB[login];
    if (user && user.pass === pass) {
        currentUser = { ...user, loginKey: login };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('loginName').value = '';
        document.getElementById('loginPass').value = '';
        updateAuthUI();
        render();
    } else {
        alert("Неправильный логин или пароль!");
    }
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    render();
}

function updateAuthUI() {
    const loginForm = document.getElementById('loginForm');
    const loggedInState = document.getElementById('loggedInState');
    const addItemForm = document.getElementById('addItemForm');
    const studentForm = document.getElementById('studentForm');

    if (currentUser) {
        loginForm.style.display = 'none';
        loggedInState.style.display = 'block';
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('currentUserInfo').innerHTML = `Привет, <b>${currentUser.name}</b><br><span style="font-size:12px; opacity:0.6;">Роль: ${currentUser.role}</span>`;
        
        // Кто может добавлять вещи: sysadmin, zavuch, teacher (Все кроме учеников/гостей)
        if (currentUser.role !== 'student') {
            addItemForm.style.display = 'block';
            studentForm.style.display = 'none';
        } else {
            addItemForm.style.display = 'none';
            studentForm.style.display = 'block';
        }
    } else {
        loginForm.style.display = 'block';
        loggedInState.style.display = 'none';
        addItemForm.style.display = 'none';
        studentForm.style.display = 'block';
    }
    checkAdminPanelVisibility();
}

// ПРОВЕРКА РОЛЕЙ ДЛЯ ОТОБРАЖЕНИЯ ПАНЕЛИ СИСАДМИНА / ЗАВУЧА
function checkAdminPanelVisibility() {
    const admPanel = document.getElementById('adminControls');
    if (!admPanel) return;
    
    if (currentUser && (currentUser.role === 'sysadmin' || currentUser.role === 'zavuch')) {
        admPanel.style.display = 'block';
        
        // Сценарий 1: Зашёл СИСАДМИН (Видит ВСЁ: Бэкапы + Баны)
        if (currentUser.role === 'sysadmin') {
            admPanel.innerHTML = `
                <hr style="opacity:0.1; margin:10px 0;">
                <p style="font-weight:bold; margin-bottom:8px; font-size:14px; color:var(--accent);">⚙️ Пульт Системного Администратора</p>
                <button onclick="downloadBackup()" class="btn-secondary" style="font-size:12px; padding:8px;">📥 Скачать резервную копию БД</button>
                <input type="file" id="uploadFile" onchange="uploadBackup(event)" style="display:none">
                <button onclick="document.getElementById('uploadFile').click()" class="btn-secondary" style="font-size:12px; padding:8px; margin-top:5px;">📤 Восстановить БД из файла</button>
                
                <div style="margin-top:12px; border-top:1px dashed rgba(0,0,0,0.1); padding-top:8px;">
                    <label style="font-size:12px; font-weight:600;">Блокировка аккаунтов:</label>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <input type="text" id="banTarget" placeholder="Логин ученика" style="margin:0; padding:6px;">
                        <button onclick="banUser()" class="btn-danger" style="margin:0; width:70px; padding:6px;">БАН</button>
                    </div>
                    <p style="font-size:11px; opacity:0.5; margin-top:4px;">В черном списке: ${JSON.stringify(bannedUsers)}</p>
                </div>
            `;
        } 
        // Сценарий 2: Зашёл ЗАВУЧ (Видит ТОЛЬКО Блокировку, бэкапы скрыты!)
        else if (currentUser.role === 'zavuch') {
            admPanel.innerHTML = `
                <hr style="opacity:0.1; margin:10px 0;">
                <p style="font-weight:bold; margin-bottom:8px; font-size:14px; color:var(--warning);">🔒 Панель контроля безопасности (Завуч)</p>
                <label style="font-size:12px; font-weight:600;">Заблокировать нарушителя:</label>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <input type="text" id="banTarget" placeholder="Логин ученика" style="margin:0; padding:6px;">
                    <button onclick="banUser()" class="btn-danger" style="margin:0; width:70px; padding:6px;">БАН</button>
                </div>
                <p style="font-size:11px; opacity:0.5; margin-top:4px;">Список заблокированных: ${JSON.stringify(bannedUsers)}</p>
            `;
        }
    } else {
        admPanel.style.display = 'none';
    }
}

// 5. ФУНКЦИИ АДМИНИСТРИРОВАНИЯ (БАНЫ / РЕЗЕРВНЫЕ КОПИИ)
function banUser() {
    const target = document.getElementById('banTarget').value.trim().toLowerCase();
    if (!target) return;
    if (target === 'админ' || target === 'завуч' || target === 'учитель') {
        alert("Ошибка! Нельзя заблокировать администрацию.");
        return;
    }
    if (!bannedUsers.includes(target)) {
        bannedUsers.push(target);
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
        alert(`Пользователь ${target} успешно заблокирован на платформе!`);
        if (currentUser && currentUser.loginKey === target) logoutUser();
        checkAdminPanelVisibility();
    } else {
        alert("Этот пользователь уже находится в бане.");
    }
}

function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "school_lost_found_db.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function uploadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
            alert("Резервная копия базы данных развернута! Страница будет обновлена.");
            window.location.reload();
        } catch(err) {
            alert("Критическая ошибка при чтении файла бэкапа!");
        }
    };
    reader.readAsText(file);
}
// 6. ТРЭКЕР ВЕЩЕЙ И АВТОМАТИЧЕСКИЕ ТАЙМЕРЫ ХРАНЕНИЯ
function addItem() {
    const nameInput = document.getElementById('itemName');
    if (!nameInput || nameInput.value.trim() === '') {
        alert("Пожалуйста, введите название вещи!");
        return;
    }

    let items = JSON.parse(localStorage.getItem('items') || '[]');
    
    // Набор красивых картинок-заглушек в зависимости от выбранной категории
    const images = {
        "Одежда": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=60",
        "Электроника": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=60",
        "Канцелярия": "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&auto=format&fit=crop&q=60",
        "Другое": "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&auto=format&fit=crop&q=60"
    };

    const selectedCat = document.getElementById('itemCat').value;

    const newItem = {
        id: Math.floor(1000 + Math.random() * 9000), // Случайный уникальный 4-значный номер вещи
        name: nameInput.value.trim(),
        cat: selectedCat,
        status: document.getElementById('itemStatus').value,
        loc: document.getElementById('itemLocation').value || "Не указано",
        photo: images[selectedCat] || images["Другое"],
        expiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 дней от текущего момента
    };

    items.push(newItem);
    localStorage.setItem('items', JSON.stringify(items));
    
    // Очищаем форму добавления
    nameInput.value = '';
    document.getElementById('itemLocation').value = '';
    
    render();
    closeMenu();
}

function removeItem(id) {
    let items = JSON.parse(localStorage.getItem('items') || '[]').filter(i => i.id !== id);
    localStorage.setItem('items', JSON.stringify(items));
    render();
}

// ЕЖЕСЕКУНДНЫЙ ОБСЧЕТ ТАЙМЕРОВ УДАЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
function updateLiveTimers() {
    const timers = document.querySelectorAll('.live-timer');
    timers.forEach(timer => {
        const expiry = parseInt(timer.getAttribute('data-expiry'));
        const diff = expiry - Date.now();
        
        if (diff <= 0) {
            timer.innerHTML = "❌ Время хранения истекло!";
            // Самоочистка просроченных вещей
            let items = JSON.parse(localStorage.getItem('items') || '[]').filter(i => i.expiry > Date.now());
            localStorage.setItem('items', JSON.stringify(items));
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            timer.innerHTML = `⏳ Удаление через: ${days}д ${hours}ч ${mins}м ${secs}с`;
        }
    });
}

// 7. ОТРИСОВКА КАРТОЧЕК И ОБНОВЛЕНИЕ СТАТИСТИКИ СВЕРХУ ЭКРАНА
function render() {
    const list = JSON.parse(localStorage.getItem('items') || '[]');
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const statusQuery = document.getElementById('filterStatus').value;
    const categoryQuery = document.getElementById('filterCategory').value;

    // Обновляем счетчики на плашках статистики в реальном времени
    document.getElementById('statTotal').innerText = list.length;
    document.getElementById('statLost').innerText = list.filter(i => i.status === 'lost').length;
    document.getElementById('statFound').innerText = list.filter(i => i.status === 'found').length;

    // Фильтруем данные по трем критериям одновременно
    const filtered = list.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery);
        const matchesStatus = (statusQuery === 'all') || (item.status === statusQuery);
        const matchesCategory = (categoryQuery === 'all') || (item.cat === categoryQuery);
        return matchesSearch && matchesStatus && matchesCategory;
    });

    const container = document.getElementById('itemsList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; opacity:0.5; font-size:16px;">Ничего не найдено по выбранным фильтрам...</div>`;
        return;
    }

    container.innerHTML = filtered.map(i => `
        <div class="card">
            <span class="item-id">#${i.id}</span>
            <span class="badge ${i.status}">${i.status}</span>
            <img src="${i.photo}" alt="${i.name}">
            <p class="card-title">${i.name}</p>
            <p class="card-info">📍 Нахождение: <b>${i.loc}</b><br>Категория: ${i.cat}</p>
            
            <p class="live-timer" data-expiry="${i.expiry}"></p>
            
            ${currentUser && currentUser.role !== 'student' ? 
                `<button onclick="removeItem(${i.id})" class="btn-danger" style="padding: 6px; font-size: 12px; margin-top: auto;">Удалить из базы</button>` : ''}
        </div>
    `).join('');

    updateLiveTimers();
}

// ЗАПУСК ПРИ СТАРТЕ СТРАНИЦЫ
window.onload = function() {
    initThemeAndStyles();
    updateAuthUI();
    render();
    
    // Запускаем бесконечный ежесекундный цикл обновления времени на карточках
    setInterval(updateLiveTimers, 1000);
};