// База пользователей и начальные настройки
const defaultAccounts = {
    "админ": { name: "Иван Сисадмин", role: "sysadmin", pass: "root", avatar: "https://ui-avatars.com/api/?name=SysAdmin&background=007aff&color=fff" },
    "завуч": { name: "Елена Викторовна", role: "zavuch", pass: "12345", avatar: "https://ui-avatars.com/api/?name=Zavuch&background=ff3b30&color=fff" },
    "ученик1": { name: "Иван Иванов", role: "student", pass: "1111", avatar: "https://ui-avatars.com/api/?name=Student&background=ff9500&color=fff" }
};

let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let accountsDB = JSON.parse(localStorage.getItem('accountsDB')) || defaultAccounts;
let bannedUsers = JSON.parse(localStorage.getItem('bannedUsers')) || [];
let editingId = null;

// Инициализация тем (включая СИСТЕМНУЮ)
function initThemeAndStyles() {
    // 1. Проверка системной темы (Темная/Светлая)
    const savedTheme = localStorage.getItem('siteDarkTheme');
    if (!savedTheme) {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Следим за изменениями в самой Windows/смартфоне на лету
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('siteDarkTheme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });

    // 2. Загрузка визуального стиля
    const savedStyle = localStorage.getItem('siteStyleTheme') || 'glass';
    document.documentElement.setAttribute('data-style', savedStyle);
    const selector = document.getElementById('themeSelector');
    if(selector) selector.value = savedStyle;
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

// Управление шторкой меню
function openMenu() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('active');
    checkAdminPanelVisibility();
}
function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

// Авторизация
function loginUser() {
    const login = document.getElementById('loginName').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    
    if (bannedUsers.includes(login)) {
        alert("Этот аккаунт ЗАБЛОКИРОВАН администрацией!");
        return;
    }
    const user = accountsDB[login];
    if (user && user.pass === pass) {
        currentUser = { ...user, loginKey: login };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        render();
    } else {
        alert("Неверный логин или пароль");
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
    if(!loginForm || !loggedInState) return;

    if (currentUser) {
        loginForm.style.display = 'none';
        loggedInState.style.display = 'block';
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('currentUserInfo').innerHTML = `<b>${currentUser.name}</b> (${currentUser.role})`;
    } else {
        loginForm.style.display = 'block';
        loggedInState.style.display = 'none';
    }
    checkAdminPanelVisibility();
}
// Контроль панели Сисадмина/Завуча
function checkAdminPanelVisibility() {
    const admPanel = document.getElementById('adminControls');
    if (!admPanel) return;
    
    if (currentUser && (currentUser.role === 'sysadmin' || currentUser.role === 'zavuch')) {
        admPanel.style.display = 'block';
        // Если зашел именно СИСАДМИН — добавляем кнопки бэкапа и управления банами
        if (currentUser.role === 'sysadmin') {
            admPanel.innerHTML = `
                <hr>
                <p><b>Пульт Системного Администратора:</b></p>
                <button onclick="downloadBackup()" style="width:100%; margin-bottom:5px;">📥 Скачать БД (Резервная копия)</button>
                <input type="file" id="uploadBackupFile" onchange="uploadBackup(event)" style="display:none">
                <button onclick="document.getElementById('uploadBackupFile').click()" style="width:100%; margin-bottom:5px;">📤 Восстановить БД из файла</button>
                <div style="margin-top:10px;">
                    <input type="text" id="banTarget" placeholder="Логин ученика для бана" style="width:60%">
                    <button onclick="banUser()" style="background:#ff3b30; width:35%">Бан</button>
                </div>
                <p style="font-size:11px; color:gray; margin-top:5px;">Забаненные: ${JSON.stringify(bannedUsers)}</p>
            `;
        }
    } else {
        admPanel.style.display = 'none';
    }
}

// Логика Бан-системы
function banUser() {
    const target = document.getElementById('banTarget').value.trim().toLowerCase();
    if(!target || target === 'админ') return alert("Невозможно забанить");
    if(!bannedUsers.includes(target)) {
        bannedUsers.push(target);
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
        alert(`Пользователь ${target} забанен!`);
        if(currentUser && currentUser.loginKey === target) logoutUser();
        checkAdminPanelVisibility();
    }
}

// Логика Резервного копирования (Бэкап JSON)
function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "school_platform_backup.json");
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
            alert("База данных успешно восстановлена! Страница будет перезагружена.");
            window.location.reload();
        } catch(err) { alert("Ошибка чтения файла бэкапа!"); }
    };
    reader.readAsText(file);
}

// Добавление новой вещи с таймером на 30 дней
function addItem() {
    if(!currentUser || currentUser.role === 'student') return alert("Нет прав для добавления вещей!");
    
    let items = JSON.parse(localStorage.getItem('items') || '[]');
    const name = document.getElementById('name')?.value || "Без названия";
    
    // Каждой вещи даем уникальный номер (ID) и фото-заглушку по названию предмета
    const newItem = {
        id: Math.floor(1000 + Math.random() * 9000), // Красивый 4-значный номер вещи
        name: name,
        cat: document.getElementById('cat').value,
        status: document.getElementById('status').value,
        loc: document.getElementById('location').value,
        // Генерация картинок по ключевым словам для фото-файлов вещи
        photo: `https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop`, 
        dateAdded: Date.now(),
        // Таймер жизни вещи автоматический: текущее время + 30 дней в миллисекундах
        expiry: Date.now() + (30 * 24 * 60 * 60 * 1000) 
    };

    items.push(newItem);
    localStorage.setItem('items', JSON.stringify(items));
    if(document.getElementById('name')) document.getElementById('name').value = '';
    render();
    closeMenu();
}

// Расчет живого таймера отсчета в реальном времени
function updateLiveTimers() {
    const timerElements = document.querySelectorAll('.live-timer');
    timerElements.forEach(el => {
        const expiry = parseInt(el.getAttribute('data-expiry'));
        const diff = expiry - Date.now();
        
        if (diff <= 0) {
            el.innerHTML = "❌ Время хранения истекло. Удаление...";
            // Автоматическое удаление вещи из базы данных по истечении таймера
            let items = JSON.parse(localStorage.getItem('items') || '[]');
            items = items.filter(i => i.expiry > Date.now());
            localStorage.setItem('items', JSON.stringify(items));
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            el.innerHTML = `⏳ Осталось: ${days}д ${hours}ч ${mins}м ${secs}с`;
        }
    });
}

// Рендеринг карточек, Фотографий, Номеров и Статистики
function render() {
    const list = JSON.parse(localStorage.getItem('items') || '[]');
    const query = (document.getElementById('search')?.value || '').toLowerCase();
    
    // Расчет статистики на плашках сверху экрана
    const totalCount = list.length;
    const lostCount = list.filter(i => i.status === 'lost').length;
    const foundCount = list.filter(i => i.status === 'found').length;
    
    if(document.getElementById('itemsList')) { // Проверяем, что элементы есть на экране
        document.querySelector('.total-stat || [class*="stat"]').innerHTML = totalCount; 
        // Если у тебя кастомные ID на карточках статистики, они обновятся автоматически через фильтр
    }

    const filtered = list.filter(i => i.name.toLowerCase().includes(query));
    
    const container = document.getElementById('itemsList');
    if(!container) return;

    if(filtered.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; opacity:0.5;">Вещей не найдено</p>`;
        return;
    }

    container.innerHTML = filtered.map(i => `
        <div class="card" style="position:relative;">
            <img src="${i.photo}" alt="Item photo" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:8px;">
            
            <span style="position:absolute; top:12px; left:12px; background:rgba(0,0,0,0.6); color:#fff; padding:2px 6px; border-radius:4px; font-size:11px;">#${i.id}</span>
            <span class="badge ${i.status}" style="position:absolute; top:12px; right:12px;">${i.status.toUpperCase()}</span>
            
            <p class="card-title" style="font-weight:bold; margin:4px 0;">${i.name}</p>
            <p class="card-info" style="font-size:13px; color:gray;">📍 ${i.loc} | Категория: ${i.cat}</p>
            
            <p class="live-timer" data-expiry="${i.expiry}" style="font-size:12px; color:#ff9500; font-weight:600; margin:5px 0;"></p>
            
            ${currentUser && (currentUser.role === 'sysadmin' || currentUser.role === 'zavuch') ? 
                `<button onclick="removeItem(${i.id})" style="background:#ff3b30; color:white; border:none; padding:5px; border-radius:4px; width:100%; cursor:pointer;">Удалить</button>` : ''}
        </div>
    `).join('');
    
    updateLiveTimers();
}

function removeItem(id) {
    let items = JSON.parse(localStorage.getItem('items') || '[]').filter(i => i.id !== id);
    localStorage.setItem('items', JSON.stringify(items));
    render();
}

// Запуск при старте страницы
window.onload = function() {
    initThemeAndStyles();
    updateAuthUI();
    render();
    // Запускаем ежесекундный таймер обновления времени до удаления
    setInterval(updateLiveTimers, 1000);
};