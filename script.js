const defaultAccounts = {
    "админ": { name: "Иван Сисадмин", role: "sysadmin", pass: "root", avatar: "https://ui-avatars.com/api/?name=Иван+Сисадмин&background=007aff&color=fff" },
    "завуч": { name: "Елена Викторовна", role: "zavuch", pass: "12345", avatar: "https://ui-avatars.com/api/?name=Елена+Викторовна&background=ff3b30&color=fff" },
    "ученик1": { name: "Иван Иванов", role: "student", pass: "1111", avatar: "https://ui-avatars.com/api/?name=Иван+Иванов&background=ff9500&color=fff" }
};
let currentUser = null, editingId = null;
let accountsDB = JSON.parse(localStorage.getItem('accountsDB')) || defaultAccounts;

function toggleAutoSaveSetting() {
    localStorage.setItem('autoSaveActive', document.getElementById('autoSaveToggle').checked ? 'true' : 'false');
}

function executeBackup() {
    if (localStorage.getItem('autoSaveActive') === 'true') {
        const data = { items: localStorage.getItem('items'), messages: localStorage.getItem('messages'), accountsDB };
        localStorage.setItem('lost_found_backup', JSON.stringify(data));
    }
}
function loginUser() {
    const login = document.getElementById('loginName').value.trim().toLowerCase();
    const user = accountsDB[login];
    if (user && user.pass === document.getElementById('loginPass').value) {
        currentUser = { ...user, loginKey: login };
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('loggedInState').style.display = 'block';
        document.getElementById('userAvatar').src = user.avatar;
        document.getElementById('currentUserInfo').innerHTML = `${user.name}`;
        if (user.role !== 'student') document.getElementById('adminControls').style.display = 'block';
        render();
    } else alert("Ошибка входа");
}

function addItem() {
    let items = JSON.parse(localStorage.getItem('items') || '[]');
    const name = document.getElementById('name').value;
    const newItem = { id: Date.now(), name, cat: document.getElementById('cat').value, status: document.getElementById('status').value, loc: document.getElementById('location').value };
    
    if(editingId) {
        items = items.map(i => i.id === editingId ? {...i, ...newItem} : i);
        editingId = null;
    } else items.push(newItem);
    
    localStorage.setItem('items', JSON.stringify(items));
    executeBackup(); render(); closeMenu();
}
function render() {
    const list = JSON.parse(localStorage.getItem('items') || '[]');
    const query = document.getElementById('search').value.toLowerCase();
    
    const filtered = list.filter(i => i.name.toLowerCase().includes(query));
    document.getElementById('itemsList').innerHTML = filtered.map(i => `
        <div class="card">
            <span class="badge ${i.status}">${i.status}</span>
            <p class="card-title">${i.name}</p>
            <p class="card-info">${i.loc}</p>
            ${currentUser ? `<button onclick="removeItem(${i.id})">Удалить</button>` : ''}
        </div>`).join('');
}

function removeItem(id) {
    let items = JSON.parse(localStorage.getItem('items')).filter(i => i.id !== id);
    localStorage.setItem('items', JSON.stringify(items));
    render();
}

setInterval(executeBackup, 10000);
window.onload = render;
// Функция открытия бокового меню
function openMenu() { 
    document.getElementById('sidebar').classList.add('open'); 
    document.getElementById('overlay').classList.add('active'); 
}

// Функция закрытия бокового меню
function closeMenu() { 
    document.getElementById('sidebar').classList.remove('open'); 
    document.getElementById('overlay').classList.remove('active'); 
}

// Переключение тем оформления
function changeStyleTheme() {
    const style = document.getElementById('themeSelector').value;
    document.documentElement.setAttribute('data-style', style);
    localStorage.setItem('siteStyleTheme', style);
}

function toggleTheme() { 
    const root = document.documentElement; 
    const theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme); 
    localStorage.setItem('siteDarkTheme', theme);
}

