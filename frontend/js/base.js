// ==============================================
// SpaceManage Pro IBS — с интеграцией сервера
// ==============================================

// --- Глобальные переменные ---
let currentUser = null;             // { username, fullName, email, isAdmin }
let users = [];                    // массив { username, full_name, email, is_admin }
let bookings = [];                 // объединённый массив броней (комнаты + рабочие места)
let infraObjects = [], chairs = [], meetingRooms = [], recreation = [];
let currentFloorKey = 'spb_5';
let currentZoom = 1.0;
const MIN_ZOOM = 1.0, MAX_ZOOM = 2.0;
let currentPage = 'map', currentCalendarDate = new Date();
let editingBookingId = null, currentTooltip = null, pendingBookingData = null;
let currentSelectedItem = null;
let currentInvitedList = [];
let currentEditInvitedList = [];
let currentMaxInvites = null;
let currentEditMaxInvites = null;

// --- Вспомогательные функции ---
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function showToast(msg, isError) { const toast = document.createElement('div'); toast.className = 'toast' + (isError ? ' error' : ''); toast.innerText = msg; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2500); }
function formatDateForDisplay(dateStr) { if (!dateStr) return ''; if (dateStr.includes('-')) { const parts = dateStr.split('-'); if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`; } return dateStr; }
function isRealAdmin() { return currentUser && currentUser.isAdmin === true; }
function saveCurrentUser() { localStorage.setItem('officeUser', JSON.stringify(currentUser)); }
function loadCurrentUser() {
    const saved = localStorage.getItem('officeUser');
    if (saved) {
        try { currentUser = JSON.parse(saved); } catch(e) { currentUser = null; }
    }
}

// --- API вызовы ---
const API_BASE = ''; // относительный путь, т.к. фронт раздаётся с того же сервера

async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-token'] = token;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const resp = await fetch(API_BASE + endpoint, options);
    if (!resp.ok) {
        let errMsg = `Ошибка ${resp.status}`;
        try {
            const data = await resp.json();
            if (data.detail) errMsg = data.detail;
            else if (data.message) errMsg = data.message;
        } catch(e) {}
        throw new Error(errMsg);
    }
    if (resp.status === 204) return null;
    return await resp.json();
}

// --- Загрузка данных с сервера ---
async function loadUsers() {
    try {
        users = await apiRequest('GET', '/api/users');
        return users;
    } catch(e) {
        showToast('Не удалось загрузить список пользователей', true);
        return [];
    }
}

async function loadBookings() {
    try {
        const roomBookings = await apiRequest('GET', '/api/booking-rooms');
        const workspaceBookings = await apiRequest('GET', '/api/booking-workspace');
        const all = [];

        // Переговорные
        roomBookings.forEach(b => {
            // Пробуем найти комнату по id (новый формат), затем по имени (старый формат)
            let room = meetingRooms.find(r => r.id === b.room);
            if (!room) {
                room = meetingRooms.find(r => r.name === b.room);
            }
            const spaceId = room ? room.id : b.room;   // если не нашли – оставляем как есть
            const spaceName = room ? room.name : b.room;
            all.push({
                id: b.id,
                spaceId: spaceId,
                spaceName: spaceName,
                spaceType: 'meeting_room',
                userName: b.username,
                date: b.booking_date,
                startTime: b.start_time,
                endTime: b.end_time,
                invitedUsers: b.participants || []
            });
        });

        // Рабочие места и зоны отдыха
        workspaceBookings.forEach(b => {
            // Ищем по id, потом по имени
            let found = chairs.find(c => c.id === b.workspace);
            if (!found) {
                found = chairs.find(c => c.name === b.workspace);
            }
            if (!found) {
                found = recreation.find(r => r.id === b.workspace);
            }
            if (!found) {
                found = recreation.find(r => r.name === b.workspace);
            }
            const spaceId = found ? found.id : b.workspace;
            const spaceName = found ? found.name : b.workspace;
            // Определяем тип: если найден в recreation – используем его type, иначе 'workspace'
            let spaceType = 'workspace';
            if (found && found.type && found.type !== 'meeting_room') {
                spaceType = found.type; // 'tennis', 'playstation', 'massage' и т.д.
            }
            all.push({
                id: b.id,
                spaceId: spaceId,
                spaceName: spaceName,
                spaceType: spaceType,
                userName: b.username,
                date: b.booking_date,
                startTime: b.start_time,
                endTime: b.end_time,
                invitedUsers: []
            });
        });

        bookings = all;
        return bookings;
    } catch(e) {
        showToast('Не удалось загрузить бронирования', true);
        return [];
    }
}

// --- Авторизация ---
async function login(username, password) {
    try {
        const result = await apiRequest('POST', '/api/login', { username, password });
        const token = result.token;
        const isAdmin = result.is_admin;
        // Загружаем пользователей
        await loadUsers();
        // Находим себя
        const me = users.find(u => u.username === token);
        const fullName = me ? me.full_name : token;
        const email = me ? me.email : '';
        currentUser = { username: token, fullName, email, isAdmin };
        saveCurrentUser();
        // Загружаем брони
        await loadBookings();
        updateAuthUI();
        renderMap();
        renderCalendar();
        renderAdminPanel();
        showToast(`Добро пожаловать, ${fullName}!`);
    } catch(e) {
        showToast('Ошибка входа: ' + e.message, true);
        throw e;
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('officeUser');
    users = [];
    bookings = [];
    updateAuthUI();
    renderMap();
    renderCalendar();
    renderAdminPanel();
    showToast('Вы вышли');
}

// --- Создание брони ---
async function createBookingOnServer(spaceId, spaceName, spaceType, date, startTime, endTime, invitedLogins) {
    // spaceId – это уникальный id объекта из floor.js
    if (spaceType === 'meeting_room') {
        const payload = {
            room: spaceId,          // теперь отправляем id, а не имя
            booking_date: date,
            start_time: startTime + ':00',
            end_time: endTime + ':00',
            participants: invitedLogins || []
        };
        await apiRequest('POST', '/api/booking-rooms', payload, currentUser.username);
    } else {
        const payload = {
            workspace: spaceId,     // отправляем id
            booking_date: date,
            start_time: startTime + ':00',
            end_time: endTime + ':00'
        };
        await apiRequest('POST', '/api/booking-workspace', payload, currentUser.username);
    }
    await loadBookings();
}

async function deleteBookingOnServer(bookingId, spaceType) {
    const endpoint = spaceType === 'meeting_room' ? `/api/booking-rooms/${bookingId}` : `/api/booking-workspace/${bookingId}`;
    await apiRequest('DELETE', endpoint, null, currentUser.username);
    await loadBookings();
}

// --- Управление пользователями (админ) ---
async function addUserOnServer(fullName, login, email, password) {
    await apiRequest('POST', '/api/users/add', {
        username: login,
        password: password,
        full_name: fullName,
        email: email
    }, currentUser.username);
    await loadUsers();
}

async function deleteUserOnServer(username) {
    await apiRequest('DELETE', `/api/users/${username}`, null, currentUser.username);
    await loadUsers();
}

// --- Функции для работы с локальными данными карты ---
function loadFloorData(floorKey) {
    const saved = localStorage.getItem(`floor_${floorKey}`);
    if (saved) return JSON.parse(saved);
    return JSON.parse(JSON.stringify(defaultFloorData[floorKey] || { infra: [], chairs: [], meetingRooms: [], recreation: [] }));
}
function saveFloorData(floorKey, data) { localStorage.setItem(`floor_${floorKey}`, JSON.stringify(data)); }
function saveCurrentFloor() { saveFloorData(currentFloorKey, { infra: infraObjects, chairs: chairs, meetingRooms: meetingRooms, recreation: recreation }); }
function switchFloor(office, floor) {
    saveCurrentFloor();
    const newKey = `${office}_${floor}`;
    currentFloorKey = newKey;
    const data = loadFloorData(newKey);
    infraObjects = data.infra || [];
    chairs = data.chairs || [];
    meetingRooms = data.meetingRooms || [];
    recreation = data.recreation || [];
    currentZoom = 1.0;
}

// --- Проверка занятости ---
function isItemBooked(spaceId, date, start, end) {
    // spaceId – имя (room или workspace)
    for (let b of bookings) {
        if (b.spaceId === spaceId && b.date === date && start < b.endTime && end > b.startTime) {
            return b;
        }
    }
    return null;
}

function getItemAvailability(spaceId, date, start, end) {
    const booking = isItemBooked(spaceId, date, start, end);
    return { available: !booking, booking };
}

function getChairAvailability(chair) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    return getItemAvailability(chair.id, date, start, end);
}

function getMeetingRoomAvailability(room) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    return getItemAvailability(room.id, date, start, end);
}
function getRecreationAvailability(rec) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    return getItemAvailability(rec.id, date, start, end);
}

// --- Рендеринг карты ---
function renderMap() {
    const office = document.getElementById('officeSelect').value, floor = document.getElementById('floorSelect').value;
    const mapContainer = document.getElementById('mapPage');
    if (office !== 'spb' || !['5','3'].includes(floor)) {
        mapContainer.innerHTML = `<div class="under-development"><h2>В разработке</h2><p>Карта скоро появится</p></div>`;
        updateStats();
        return;
    }
    const newKey = `spb_${floor}`;
    if (currentFloorKey !== newKey) switchFloor('spb', floor);
    const imgSrc = floor === '5' ? 'assets/floor5.png' : 'assets/floor3.png';
    const floorLabels = {'5':'5 этаж — Open Space','3':'3 этаж — Конференц-зал'};
    mapContainer.innerHTML = `<div class="map-container">
        <div class="map-header">
            <div class="map-title">${floorLabels[floor]}</div>
            <div class="right-header-group">
                <div class="stats-bar">
                    <div class="stat-card">Свободно <span id="freeCount">0</span></div>
                    <div class="stat-card">Занято <span id="occupiedCount">0</span></div>
                    <div class="stat-card">Мои брони <span id="myBookingsCount">0</span></div>
                </div>
                <div class="zoom-controls">
                    <button class="zoom-btn" id="zoomOutBtn">−</button>
                    <span class="zoom-level" id="zoomLevel">${Math.round(currentZoom*100)}%</span>
                    <button class="zoom-btn" id="zoomInBtn">+</button>
                    <button class="zoom-btn" id="resetZoomBtn">⟳</button>
                </div>
            </div>
        </div>
        <div class="map-content">
            <div class="map-area">
                <div class="map-wrapper" id="mapWrapper">
                    <div class="map-inner" id="mapInner" style="transform:scale(${currentZoom})">
                        ${imgSrc ? `<img src="${imgSrc}" class="office-plan-img">` : `<div class="floor-placeholder"><div class="ph-icon">🏢</div><div class="ph-text">${floorLabels[floor]}</div></div>`}
                        <div id="objectsContainer"></div>
                    </div>
                </div>
            </div>
            <div class="sidebar" id="sidebar">
                <div id="sidebarContent"><div class="empty-state">Выберите место</div></div>
            </div>
        </div>
        <div class="my-bookings-section" id="myBookingsSection">
            <div class="my-bookings-title">Мои текущие бронирования</div>
            <div id="mapMyBookingsList" class="my-bookings-list"></div>
        </div>
    </div>`;
    document.getElementById('zoomInBtn').onclick = zoomIn;
    document.getElementById('zoomOutBtn').onclick = zoomOut;
    document.getElementById('resetZoomBtn').onclick = resetZoom;
    document.getElementById('mapWrapper').addEventListener('wheel', e => { e.preventDefault(); if(e.deltaY<0) zoomIn(); else zoomOut(); }, { passive: false });
    renderObjects();
    updateStats();
    renderMapMyBookings();
}

function renderObjects() {
    const c = document.getElementById('objectsContainer');
    if(!c) return;
    c.innerHTML='';
    // Инфраструктура
    infraObjects.forEach(obj=>{
        const el=document.createElement('div');
        el.id=obj.id;
        el.className='map-object object-infra';
        el.style.left=obj.x+'%';
        el.style.top=obj.y+'%';
        el.innerHTML=obj.label;
        el.title=obj.name;
        el.onclick=(e)=>{ e.stopPropagation(); showInfraInfo(obj); highlightNearestSpaces(obj.x,obj.y); };
        c.appendChild(el);
    });
    // Переговорные
    meetingRooms.forEach(room=>{
        const {available}=getMeetingRoomAvailability(room);
        const el=document.createElement('div');
        el.id=room.id;
        el.className=`map-object object-meeting-room ${available?'meeting-available':'meeting-occupied'}`;
        el.style.left=room.x+'%';
        el.style.top=room.y+'%';
        el.innerHTML=room.label||'👥';
        el.title=`${room.name} (${room.capacity} чел.)`;
        el.onclick=(e)=>{ e.stopPropagation(); showMeetingRoomInfo(room); };
        el.onmouseenter=()=>showTooltip(el,room,'meeting_room');
        el.onmouseleave=hideTooltip;
        c.appendChild(el);
    });
    // Зоны отдыха
    recreation.forEach(rec=>{
        const {available}=getRecreationAvailability(rec);
        const el=document.createElement('div');
        el.id=rec.id;
        el.className=`map-object object-recreation ${available?'rec-available':'rec-occupied'}`;
        el.style.left=rec.x+'%';
        el.style.top=rec.y+'%';
        el.innerHTML=rec.label;
        el.title=rec.name;
        el.onclick=(e)=>{ e.stopPropagation(); showRecreationInfo(rec); };
        el.onmouseenter=()=>showTooltip(el,rec,rec.type);
        el.onmouseleave=hideTooltip;
        c.appendChild(el);
    });
    // Кресла
    chairs.forEach(chair=>{
        const {available}=getChairAvailability(chair);
        const el=document.createElement('div');
        el.id=chair.id;
        el.className=`map-object object-chair ${available?'chair-available':'chair-occupied'}`;
        el.style.left=chair.x+'%';
        el.style.top=chair.y+'%';
        el.title=chair.name;
        el.onclick=()=>{ if(available) openBookingModal(chair, 'chair'); else showToast('Это место уже занято',true); };
        el.onmouseenter=()=>showTooltip(el,chair,'chair');
        el.onmouseleave=hideTooltip;
        c.appendChild(el);
    });
    updateStats();
}

function showTooltip(element, item, type) {
    let available, booking;
    if (type === 'chair') { const res = getChairAvailability(item); available = res.available; booking = res.booking; }
    else if (type === 'meeting_room') { const res = getMeetingRoomAvailability(item); available = res.available; booking = res.booking; }
    else { const res = getRecreationAvailability(item); available = res.available; booking = res.booking; }
    const start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    let text = `<strong>${escapeHtml(item.name)}</strong><br>`;
    if (type === 'meeting_room') text += `${item.capacity} чел.<br>`;
    if (!available && booking) {
        const owner = users.find(u => u.username === booking.userName);
        const ownerName = owner ? owner.full_name : booking.userName;
        text += `Занято: ${booking.startTime}—${booking.endTime}<br>${escapeHtml(ownerName)}`;
    } else text += `Свободно ${start}—${end}`;
    if (currentTooltip) currentTooltip.remove();
    const tt = document.createElement('div'); tt.className = 'tooltip'; tt.innerHTML = text; document.body.appendChild(tt);
    const rect = element.getBoundingClientRect();
    tt.style.left = (rect.left + rect.width/2 - tt.offsetWidth/2) + 'px';
    tt.style.top = (rect.top - tt.offsetHeight - 8) + 'px';
    currentTooltip = tt;
}
function hideTooltip() { if (currentTooltip) { currentTooltip.remove(); currentTooltip = null; } }

function showInfraInfo(obj) {
    const nearest = findNearestSpaces(obj.x, obj.y, 3);
    let nearestHtml = nearest.length > 0 ? nearest.map(s => `<li class="nearest-item" onclick="window.openBookingModalFromId('${s.id}', '${s.spaceType}')"><div><strong>${escapeHtml(s.name)}</strong><br><span style="font-size:11px;">${s.spaceType === 'chair' ? 'Рабочее место' : 'Переговорная'}</span><br><span style="font-size:10px;">${Math.round(s.dist)}%</span></div><button class="btn-book1 animated-btn">Занять</button></li>`).join('') : '<li class="empty-state">Нет свободных мест</li>';
    document.getElementById('sidebarContent').innerHTML = `<div class="info-card"><h3>${escapeHtml(obj.name)}</h3><p>${escapeHtml(obj.desc)}</p><p style="font-size:11px;margin-top:8px;">${document.getElementById('globalStartFilter').value}—${document.getElementById('globalEndFilter').value}</p></div><div class="nearest-title">Ближайшие свободные места:</div><ul class="nearest-list">${nearestHtml}</ul>`;
}
function showMeetingRoomInfo(room) {
    const {available, booking} = getMeetingRoomAvailability(room);
    const start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    let status = available ? '<span style="color:var(--ibs-lime);">Свободна</span>' : `<span style="color:#e74c3c;">Занята (${booking?.startTime}—${booking?.endTime})</span>`;
    const btn = available ? `<button class="btn-book1 animated-btn" style="margin-top:15px; width:50%;" onclick="openMeetingBookingModal('${room.id}')">Забронировать</button>` : '';
    document.getElementById('sidebarContent').innerHTML = `<div class="info-card"><h3>${escapeHtml(room.name)}</h3><p>${escapeHtml(room.desc)}</p><p>Вместимость: ${room.capacity} человек</p><p>Проектор: ${room.hasProjector ? 'есть' : 'нет'}</p><p>${start}—${end}</p><p>${status}</p>${btn}</div>`;
}
function showRecreationInfo(rec) {
    const {available, booking} = getRecreationAvailability(rec);
    const start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    let status = available ? '<span style="color:var(--ibs-lime);">Свободно</span>' : `<span style="color:#e74c3c;">Занято (${booking?.startTime}—${booking?.endTime})</span>`;
    const btn = available ? `<button class="btn-book1 animated-btn" style="margin-top:15px; width:50%;" onclick="openRecreationBookingModal('${rec.id}')">Забронировать</button>` : '';
    document.getElementById('sidebarContent').innerHTML = `<div class="info-card"><h3>${rec.label} ${escapeHtml(rec.name)}</h3><p>${escapeHtml(rec.desc)}</p><p>${start}—${end}</p><p>${status}</p>${btn}</div>`;
}

function findNearestSpaces(objX, objY, limit = 3) {
    const date = document.getElementById('globalDateFilter').value, start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    const availableChairs = chairs.filter(c => !isItemBooked(c.id, date, start, end) && c.available);
    const availableRooms = meetingRooms.filter(r => !isItemBooked(r.id, date, start, end) && r.available);
    const allSpaces = [...availableChairs.map(s => ({ ...s, spaceType: 'chair', icon: '💺' })), ...availableRooms.map(s => ({ ...s, spaceType: 'meeting_room', icon: '👥' }))];
    return allSpaces.map(s => ({ ...s, dist: Math.hypot(s.x-objX, s.y-objY) })).sort((a,b)=>a.dist-b.dist).slice(0, limit);
}
function highlightNearestSpaces(objX, objY) { document.querySelectorAll('.object-chair, .object-meeting-room').forEach(el => el.classList.remove('chair-highlighted', 'meeting-highlighted')); findNearestSpaces(objX, objY, 3).forEach(space => { const el = document.getElementById(space.id); if (el) { if (space.spaceType === 'chair') el.classList.add('chair-highlighted'); else el.classList.add('meeting-highlighted'); } }); }

function updateStats() {
    const freeEl = document.getElementById('freeCount');
    const occEl = document.getElementById('occupiedCount');
    const myEl = document.getElementById('myBookingsCount');
    if (!freeEl || !occEl || !myEl) return;
    const filterDate = document.getElementById('globalDateFilter').value;
    const filterStart = document.getElementById('globalStartFilter').value;
    const filterEnd = document.getElementById('globalEndFilter').value;
    let totalSpaces = 0;
    let occupiedCount = 0;
    let myBookingsCount = 0;
    if (typeof chairs !== 'undefined') totalSpaces += chairs.filter(c => c.available !== false).length;
    if (typeof meetingRooms !== 'undefined') totalSpaces += meetingRooms.filter(r => r.available !== false).length;
    if (typeof recreation !== 'undefined') totalSpaces += recreation.filter(rec => rec.available !== false).length;
    bookings.forEach(b => {
        const isSameDate = (b.date === filterDate);
        const isTimeOverlapping = (filterStart < b.endTime && filterEnd > b.startTime);
        if (isSameDate && isTimeOverlapping) {
            occupiedCount++;
            if (currentUser && b.userName === currentUser.username) {
                myBookingsCount++;
            }
        }
    });
    const freeCount = Math.max(0, totalSpaces - occupiedCount);
    freeEl.innerText = freeCount;
    occEl.innerText = occupiedCount;
    myEl.innerText = myBookingsCount;
}

function renderMapMyBookings() {
    const container = document.getElementById('mapMyBookingsList');
    if (!container) return;
    if (!currentUser) { container.innerHTML = '<div style="color:var(--ibs-text-light); text-align:center; padding:12px;">Войдите, чтобы увидеть свои бронирования</div>'; return; }
    const selectedDate=document.getElementById('globalDateFilter')?.value;
    const userBookings = bookings.filter(b => b.userName === currentUser.username && b.date===selectedDate);
    if (userBookings.length === 0) { container.innerHTML = '<div style="color:var(--ibs-text-light); text-align:center; padding:12px;">У вас нет активных бронирований</div>'; return; }
    container.innerHTML = userBookings.map(b => {
        const spaceName = b.spaceName;
        const invited = b.invitedUsers && b.invitedUsers.length ? b.invitedUsers.map(u => {
            const user = users.find(usr => usr.username === u);
            return user ? user.full_name : u;
        }).join(', ') : '';
        return `<div class="my-booking-item">
            <div class="my-booking-info">
                <strong>${escapeHtml(spaceName)}</strong><br>
                ${formatDateForDisplay(b.date)} · ${b.startTime}—${b.endTime}
                ${invited ? `<br><span style="font-size:0.7rem;">👥 ${escapeHtml(invited)}</span>` : ''}
            </div>
            <div>
                <button class="btn-cancel-small" onclick="window.cancelBookingFromMap('${b.id}')">Отменить</button>
            </div>
        </div>`;
    }).join('');
}

window.cancelBookingFromMap = async function(id) {
    const b = bookings.find(b => b.id == id);
    if(!b) return;
    if(!confirm(`Отменить бронь "${b.spaceName}"?`)) return;
    try {
        await deleteBookingOnServer(id, b.spaceType);
        renderMap();
        renderCalendar();
        showToast('Бронь отменена');
        addNotification(`Бронь ${b.spaceName} отменена`);
    } catch(e) {
        showToast('Ошибка при отмене: ' + e.message, true);
    }
};

// --- Бронирование (модалки) ---
function openBookingModal(item, type) {
    if(!currentUser){ document.getElementById('authModal').classList.add('show'); return; }
    currentSelectedItem = { id: item.id, name: item.name, type: type };
    if (type === 'meeting_room') { const room = meetingRooms.find(r => r.id === item.id); currentMaxInvites = room ? room.capacity : null; }
    else if(type==='playstation' || type==='recreation'){ currentMaxInvites = 2; }
    else { currentMaxInvites = 0; }
    const inviteGroup=document.querySelector('#bookingModal .invite-group'); if(inviteGroup) inviteGroup.style.display=currentMaxInvites>0?'block':'none';
    const cols=document.querySelector('#bookingModal .booking-two-columns'); if(cols){ cols.classList.toggle('single-seat-mode', currentMaxInvites<=0); }
    const capacityInfoSpan = document.getElementById('capacityInfo'); if (capacityInfoSpan) { capacityInfoSpan.innerHTML = currentMaxInvites !== null ? `Макс. ${currentMaxInvites} чел.` : ''; }
    document.getElementById('modalSelectedSpace').innerHTML = escapeHtml(item.name);
    document.getElementById('modalBookingDate').value = document.getElementById('globalDateFilter').value;
    document.getElementById('modalStartTime').value = document.getElementById('globalStartFilter').value;
    document.getElementById('modalEndTime').value = document.getElementById('globalEndFilter').value;
    currentInvitedList = []; renderInviteList('inviteListContainer', currentInvitedList, () => {}, currentMaxInvites); updateAddButtonState('inviteListContainer', 0, currentMaxInvites);
    document.getElementById('bookingModal').classList.add('show');
}
function openMeetingBookingModal(roomId) { const room = meetingRooms.find(r=>r.id===roomId); if(room) openBookingModal(room, 'meeting_room'); }
function openRecreationBookingModal(recId) { const rec = recreation.find(r=>r.id===recId); if(rec) openBookingModal(rec, rec.type); }
window.openBookingModalFromId = function(id, type) {
    if(type === 'chair') { const c = chairs.find(ch=>ch.id===id); if(c) openBookingModal(c, 'chair'); }
    else if(type === 'meeting_room') { const r = meetingRooms.find(rm=>rm.id===id); if(r) openBookingModal(r, 'meeting_room'); }
};

document.getElementById('addInviteBtn').onclick = () => { addInviteToList(currentInvitedList, 'inviteListContainer', currentMaxInvites); };
document.getElementById('editAddInviteBtn').onclick = () => { addInviteToList(currentEditInvitedList, 'editInviteListContainer', currentEditMaxInvites); };

function renderInviteList(containerId, invitedList, onRemove, maxInvites) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (invitedList.length === 0) { container.innerHTML = '<div style="color:var(--ibs-text-light); font-size:0.75rem; text-align:center; padding:8px;">Нет приглашённых</div>'; return; }
    container.innerHTML = invitedList.map((invite, index) => `<div class="invite-item"><input type="text" value="${escapeHtml(invite)}" placeholder="Имя коллеги" data-index="${index}" class="invite-name-input"><button class="remove-invite-btn" data-index="${index}">✖</button></div>`).join('');
    container.querySelectorAll('.invite-name-input').forEach(input => { input.addEventListener('change', (e) => { const idx = parseInt(e.target.dataset.index); if (!isNaN(idx) && invitedList[idx]) { invitedList[idx] = e.target.value.trim() || `Коллега ${idx + 1}`; renderInviteList(containerId, invitedList, onRemove, maxInvites); } }); });
    container.querySelectorAll('.remove-invite-btn').forEach(btn => { btn.addEventListener('click', (e) => { const idx = parseInt(btn.dataset.index); if (!isNaN(idx)) { invitedList.splice(idx, 1); renderInviteList(containerId, invitedList, onRemove, maxInvites); if (onRemove) onRemove(); updateAddButtonState(containerId, invitedList.length, maxInvites); } }); });
}
function updateAddButtonState(containerId, currentCount, maxInvites) { const addBtn = containerId === 'inviteListContainer' ? document.getElementById('addInviteBtn') : document.getElementById('editAddInviteBtn'); if (addBtn && maxInvites !== null) { addBtn.disabled = currentCount >= maxInvites; addBtn.title = currentCount >= maxInvites ? `Максимум ${maxInvites} приглашённых` : ''; } }
function addInviteToList(invitedList, renderContainerId, maxInvites) { if (maxInvites !== null && invitedList.length >= maxInvites) { showToast(`Максимум можно пригласить ${maxInvites} коллег`, true); return; } invitedList.push(`Коллега ${invitedList.length + 1}`); renderInviteList(renderContainerId, invitedList, () => {}, maxInvites); updateAddButtonState(renderContainerId, invitedList.length, maxInvites); }

// Подтверждение брони
document.getElementById('confirmBookingBtn').onclick = () => {
    if(!currentSelectedItem || !currentUser) return;
    const date = document.getElementById('modalBookingDate').value, start = document.getElementById('modalStartTime').value, end = document.getElementById('modalEndTime').value;
    if(!date || !start || !end){ showToast('Заполните все поля', true); return; }
    if(start >= end){ showToast('Время окончания должно быть позже начала', true); return; }
    // Проверка занятости


    const spaceId = currentSelectedItem.id;
    if(isItemBooked(spaceId, date, start, end)){ showToast('Это место уже занято', true); return; }
    // Преобразуем имена приглашённых в логины
    const invitedNames = currentInvitedList.filter(n => n.trim() !== '');
    const invitedLogins = [];
    for (let name of invitedNames) {
        const found = users.find(u => u.full_name === name.trim());
        if (found) invitedLogins.push(found.username);
        else {
            showToast(`Пользователь "${name}" не найден`, true);
            return;
        }
    }
    pendingBookingData = { item: currentSelectedItem, date, start, end, invitedLogins };
    document.getElementById('bookingModal').classList.remove('show');
    let invitedText = pendingBookingData.invitedLogins.length ? `<br>Приглашены: ${pendingBookingData.invitedLogins.map(u => {
        const user = users.find(usr => usr.username === u);
        return user ? user.full_name : u;
    }).join(', ')}` : '';
    document.getElementById('confirmPopupInfo').innerHTML = `<strong>${escapeHtml(currentSelectedItem.name)}</strong><br>${formatDateForDisplay(date)} · ${start}—${end}${invitedText}`;
    document.getElementById('confirmPopup').classList.add('show');
};
document.getElementById('confirmPopupOkBtn').onclick = async () => {
    if(!pendingBookingData) return;
    const { item, date, start, end, invitedLogins } = pendingBookingData;
    try {
        await createBookingOnServer(item.id, item.name, item.type, date, start, end, invitedLogins);
        document.getElementById('confirmPopup').classList.remove('show');
        showToast(`${item.name} забронировано`);
        addNotification(`Вы забронировали ${item.name} на ${formatDateForDisplay(date)} ${start}–${end}`);
        if(invitedLogins.length) addNotification(`Приглашения отправлены: ${invitedLogins.map(u => {
            const user = users.find(usr => usr.username === u);
            return user ? user.full_name : u;
        }).join(', ')}`);
        renderMap();
        renderCalendar();
        renderProfileBookingsList();
        pendingBookingData = null; currentSelectedItem = null; currentInvitedList = []; currentMaxInvites = null;
    } catch(e) {
        showToast('Ошибка бронирования: ' + e.message, true);
    }
};
document.getElementById('confirmPopupCancelBtn').onclick = () => {
    document.getElementById('confirmPopup').classList.remove('show');
    if(currentSelectedItem) document.getElementById('bookingModal').classList.add('show');
    pendingBookingData = null;
};
document.getElementById('closeModalBtn').onclick = () => {
    document.getElementById('bookingModal').classList.remove('show');
    currentSelectedItem = null; pendingBookingData = null; currentInvitedList = []; currentMaxInvites = null;
};

// --- Редактирование брони (удаление + создание) ---
window.editBooking = function(id) {
    const b = bookings.find(b => b.id == id);
    if(!b) return;
    editingBookingId = id;
    // Определяем максимальное количество приглашений
    if (b.spaceType === 'meeting_room') {
        const room = meetingRooms.find(r => r.id === b.spaceId);
        currentEditMaxInvites = room ? room.capacity : null;
    } else {
        currentEditMaxInvites = 0;
    }
    const editCapacityInfoSpan = document.getElementById('editCapacityInfo');
    if (editCapacityInfoSpan) {
        editCapacityInfoSpan.innerHTML = currentEditMaxInvites !== null ? `Макс. ${currentEditMaxInvites} чел.` : '';
    }
    const editInviteGroup = document.querySelector('#editModal .invite-group');
    if (editInviteGroup) {
        editInviteGroup.style.display = currentEditMaxInvites > 0 ? 'block' : 'none';
    }
    const editCols = document.querySelector('#editModal .booking-two-columns');
    if (editCols) {
        editCols.classList.toggle('single-seat-mode', currentEditMaxInvites <= 0);
    }
    document.getElementById('editSelectedSpace').innerHTML = escapeHtml(b.spaceName);
    document.getElementById('editBookingDate').value = b.date;
    document.getElementById('editStartTime').value = b.startTime;
    document.getElementById('editEndTime').value = b.endTime;
    // Преобразуем логины приглашённых в имена для отображения
    const invitedNames = (b.invitedUsers || []).map(u => {
        const user = users.find(usr => usr.username === u);
        return user ? user.full_name : u;
    });
    currentEditInvitedList = invitedNames;
    const containerEl = document.getElementById('editInviteListContainer');
    if (containerEl) {
        if (currentEditMaxInvites > 0) {
            renderInviteList('editInviteListContainer', currentEditInvitedList, function(index) {
                currentEditInvitedList.splice(index, 1);
                renderInviteList('editInviteListContainer', currentEditInvitedList, this, currentEditMaxInvites);
                updateAddButtonState('editInviteListContainer', currentEditInvitedList.length, currentEditMaxInvites);
            }, currentEditMaxInvites);
            updateAddButtonState('editInviteListContainer', currentEditInvitedList.length, currentEditMaxInvites);
        } else {
            containerEl.innerHTML = '';
        }
    }
    document.getElementById('editModal').classList.add('show');
};

document.getElementById('saveEditBtn').onclick = async () => {
    if(!editingBookingId) return;
    const oldBooking = bookings.find(b => b.id == editingBookingId);
    if(!oldBooking) return;
    const nd = document.getElementById('editBookingDate').value;
    const ns = document.getElementById('editStartTime').value;
    const ne = document.getElementById('editEndTime').value;
    if(!nd || !ns || !ne){ showToast('Заполните поля', true); return; }
    if(ns >= ne){ showToast('Время некорректно', true); return; }
    // Проверим пересечение с другими
    for(let b of bookings){
        if(b.id !== editingBookingId && b.spaceId === oldBooking.spaceId && b.date === nd && ns < b.endTime && ne > b.startTime){
            showToast('Уже занято в это время', true); return;
        }
    }
    // Преобразуем имена приглашённых в логины
    const invitedNames = currentEditInvitedList.filter(n => n.trim() !== '');
    const invitedLogins = [];
    for (let name of invitedNames) {
        const found = users.find(u => u.full_name === name.trim());
        if (found) invitedLogins.push(found.username);
        else {
            showToast(`Пользователь "${name}" не найден`, true);
            return;
        }
    }
    try {
        // Сначала удаляем старую
        await deleteBookingOnServer(editingBookingId, oldBooking.spaceType);
        // Создаём новую
        await createBookingOnServer(oldBooking.spaceId, oldBooking.spaceName, oldBooking.spaceType, nd, ns, ne, invitedLogins);
        document.getElementById('editModal').classList.remove('show');
        showToast('Бронирование обновлено');
        addNotification(`Бронь ${oldBooking.spaceName} изменена на ${formatDateForDisplay(nd)} ${ns}–${ne}`);
        renderMap();
        renderCalendar();
        renderProfileBookingsList();
        editingBookingId = null;
        currentEditInvitedList = [];
        currentEditMaxInvites = null;
    } catch(e) {
        showToast('Ошибка при обновлении: ' + e.message, true);
    }
};
document.getElementById('closeEditBtn').onclick = () => {
    document.getElementById('editModal').classList.remove('show');
    editingBookingId = null; currentEditInvitedList = []; currentEditMaxInvites = null;
};

// --- Календарь ---
function renderCalendar() {
    const year = currentCalendarDate.getFullYear(), month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    while(grid.children.length > 7) grid.removeChild(grid.lastChild);
    for(let i = 0; i < startWeekday; i++){
        const empty = document.createElement('div');
        empty.className = 'calendar-day';
        empty.style.background = 'transparent';
        grid.appendChild(empty);
    }
    for(let d = 1; d <= daysInMonth; d++){
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayBookings = bookings.filter(b => b.date === dateStr && (currentUser ? b.userName === currentUser.username : false));
        const div = document.createElement('div');
        div.className = 'calendar-day';
        const bookingDots = dayBookings.map(() => `<div class="booking-dot"></div>`).join('');
        div.innerHTML = `<div class="calendar-day-number">${d}</div>${bookingDots}${dayBookings.length > 0 ? '<div class="event-badge">Бронь</div>' : ''}`;
        div.onclick = () => {
            if(dayBookings.length === 0){
                alert(`Нет броней на ${formatDateForDisplay(dateStr)}`);
            } else if(dayBookings.length === 1){
                openBookingEditFromCalendar(dayBookings[0]);
            } else {
                let selectHtml = '<div style="margin-bottom:15px;"><select id="bookingSelect" style="width:100%; padding:10px; border-radius:12px; border:1px solid var(--ibs-border);">';
                dayBookings.forEach(b => {
                    selectHtml += `<option value="${b.id}">${escapeHtml(b.spaceName)} (${b.startTime}—${b.endTime})</option>`;
                });
                selectHtml += '</select></div>';
                const modalContent = document.createElement('div');
                modalContent.className = 'booking-modal-content';
                modalContent.innerHTML = `<h3>Бронирования на ${formatDateForDisplay(dateStr)}</h3>${selectHtml}<div class="modal-buttons" style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button type="button" class="animated-btn btn-ch" id="calendarSelectOkBtn">Выбрать</button>
                    <button type="button" class="animated-btn btn-clo" id="calendarSelectCancelBtn">Закрыть</button>
                </div>`;
                const tempModal = document.createElement('div');
                tempModal.className = 'booking-modal show';
                tempModal.style.display = 'flex';
                tempModal.appendChild(modalContent);
                document.body.appendChild(tempModal);
                document.getElementById('calendarSelectOkBtn').onclick = () => {
                    const selectedId = document.getElementById('bookingSelect').value;
                    const selectedBooking = dayBookings.find(b => b.id === selectedId);
                    if(selectedBooking) openBookingEditFromCalendar(selectedBooking);
                    tempModal.remove();
                };
                document.getElementById('calendarSelectCancelBtn').onclick = () => tempModal.remove();
            }
        };
        grid.appendChild(div);
    }
    document.getElementById('currentMonthYear').innerText = firstDay.toLocaleString('ru', { month: 'long', year: 'numeric' });
    updateCalendarStats();
}

function openBookingEditFromCalendar(booking) {
    window.editBooking(booking.id);
}

function updateCalendarStats() {
    const count = currentUser ? bookings.filter(b => b.userName === currentUser.username).length : 0;
    const span = document.getElementById('calendarBookingsCount');
    if (span) span.innerText = count;
}

// --- Профиль ---
function renderProfileBookingsList() {
    const div = document.getElementById('profileBookingsList');
    if(!div) return;
    if(!currentUser){ div.innerHTML = 'Войдите, чтобы управлять бронями'; return; }
    const ub = bookings.filter(b => b.userName === currentUser.username);
    if(ub.length === 0){ div.innerHTML = 'Нет активных броней'; return; }
    div.innerHTML = ub.map(b => {
        const invited = b.invitedUsers && b.invitedUsers.length ? b.invitedUsers.map(u => {
            const user = users.find(usr => usr.username === u);
            return user ? user.full_name : u;
        }).join(', ') : '';
        return `<div class="booking-item"><div><strong>${escapeHtml(b.spaceName)}</strong><br>${formatDateForDisplay(b.date)} ${b.startTime}—${b.endTime}${invited ? `<br>Приглашены: ${escapeHtml(invited)}` : ''}</div><div class="booking-actions"><button class="btn-edit-booking" onclick="window.editBooking('${b.id}')">Редактировать</button><button class="btn-cancel-booking" onclick="window.cancelBooking('${b.id}')">Отменить</button></div></div>`;
    }).join('');
}

window.cancelBooking = async function(id) {
    const b = bookings.find(b => b.id == id);
    if(!b) return;
    if(!confirm(`Отменить бронь "${b.spaceName}"?`)) return;
    try {
        await deleteBookingOnServer(id, b.spaceType);
        renderMap();
        renderCalendar();
        renderProfileBookingsList();
        showToast('Бронь отменена');
        addNotification(`Бронь ${b.spaceName} отменена`);
    } catch(e) {
        showToast('Ошибка при отмене: ' + e.message, true);
    }
};

// --- Админ-панель ---
function renderAdminPanel() {
    const container = document.getElementById('adminPanelContainer');
    if (!container) return;
    if (!currentUser || !isRealAdmin()) { container.innerHTML = ''; return; }
    container.innerHTML = `<div class="admin-panel"><h3>Панель администратора</h3><div class="admin-users-list" id="adminUsersList"></div><div class="admin-add-form"><input type="text" id="newEmpFullName" placeholder="Полное имя (Иванов И.И.)"><input type="text" id="newEmpLogin" placeholder="Логин"><input type="email" id="newEmpEmail" placeholder="Email"><input type="text" id="newEmpPass" placeholder="Пароль"><button class="admin-add-btn" id="addEmployeeBtn">Добавить</button></div></div>`;
    renderEmployeeList();
    document.getElementById('addEmployeeBtn')?.addEventListener('click', async () => {
        const fullName = document.getElementById('newEmpFullName').value.trim();
        const login = document.getElementById('newEmpLogin').value.trim();
        const email = document.getElementById('newEmpEmail').value.trim();
        const pass = document.getElementById('newEmpPass').value.trim();
        if (!fullName || !login || !email || !pass) { showToast('Заполните все поля', true); return; }
        try {
            await addUserOnServer(fullName, login, email, pass);
            renderAdminPanel();
            showToast(`Сотрудник ${fullName} добавлен`);
        } catch(e) {
            showToast('Ошибка: ' + e.message, true);
        }
    });
}
function renderEmployeeList() {
    const list = document.getElementById('adminUsersList');
    if (!list) return;
    const adminUsers = users.filter(u => u.username !== 'admin');
    if (adminUsers.length === 0) { list.innerHTML = '<div style="text-align:center;color:var(--ibs-text-light);">Нет сотрудников</div>'; return; }
    list.innerHTML = adminUsers.map(u => `<div class="admin-user-item"><div class="admin-user-info"><div class="admin-user-name">${escapeHtml(u.full_name)} ${u.is_admin ? '👑' : ''}</div><div class="admin-user-email">${escapeHtml(u.username)} | ${escapeHtml(u.email)}</div></div>${!u.is_admin ? `<button class="admin-delete-btn" data-username="${u.username}">Удалить</button>` : '<span style="font-size:0.7rem;color:var(--ibs-text-light);">Админ</span>'}</div>`).join('');
    document.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const username = btn.dataset.username;
            const userToDelete = users.find(u => u.username === username);
            if (!userToDelete) return;
            if (userToDelete.is_admin) { showToast('Нельзя удалить администратора', true); return; }
            if (!confirm(`Удалить пользователя ${userToDelete.full_name}?`)) return;
            try {
                await deleteUserOnServer(username);
                renderAdminPanel();
                showToast(`Пользователь ${userToDelete.full_name} удалён`);
            } catch(e) {
                showToast('Ошибка: ' + e.message, true);
            }
        });
    });
}

// --- Навигация ---
function switchPage(page) {
    currentPage = page;
    document.getElementById('mapPage').style.display = page === 'map' ? 'block' : 'none';
    document.getElementById('calendarPage').classList.toggle('show', page === 'calendar');
    document.getElementById('profilePage').classList.toggle('show', page === 'profile');
    const navControls = document.querySelector('.nav-controls');
    const filterBar = document.querySelector('.filter-bar');
    if (navControls) navControls.style.display = page === 'map' ? 'flex' : 'none';
    if (filterBar) filterBar.style.display = page === 'map' ? 'flex' : 'none';
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    const active = document.querySelector(`[data-page="${page}"]`);
    if(active) active.classList.add('active');
    if(page === 'calendar') renderCalendar();
    if(page === 'profile'){ renderProfileBookingsList(); renderAdminPanel(); }
}

// --- Пользовательский интерфейс ---
function getUserFirstName(fullName) {
    if (!fullName || fullName === 'Гость') return 'Гость';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return parts[1];
    return parts[0];
}
function updateAuthUI() {
    const displayName = currentUser ? getUserFirstName(currentUser.fullName) : 'Гость';
    document.getElementById('menuUserName').innerText = displayName;
    document.getElementById('menuUserEmail').innerText = currentUser?.email || 'Войдите в систему';
    document.getElementById('menuLoginBtn').style.display = currentUser ? 'none' : 'block';
    document.getElementById('menuLogoutBtn').style.display = currentUser ? 'block' : 'none';
    const header = document.getElementById('profileHeader'), loginBtn = document.getElementById('loginBtnItem'), logoutBtn = document.getElementById('logoutBtnItem');
    if(currentUser){ header.innerHTML = escapeHtml(currentUser.fullName) + (isRealAdmin() ? ' (Админ)' : ''); loginBtn.style.display = 'none'; logoutBtn.style.display = 'flex'; } else { header.innerHTML = 'Профиль'; loginBtn.style.display = 'flex'; logoutBtn.style.display = 'none'; }
    updateStats(); renderAdminPanel(); updateCalendarStats();
}

// --- Обработчики событий ---
document.getElementById('menuLoginBtn').onclick = () => document.getElementById('authModal').classList.add('show');
document.getElementById('menuLogoutBtn').onclick = () => { logout(); setTimeout(()=>location.reload(), 800); };
document.getElementById('loginBtnItem').onclick = () => document.getElementById('authModal').classList.add('show');
document.getElementById('logoutBtnItem').onclick = () => { logout(); setTimeout(()=>location.reload(), 800); };

document.getElementById('doLoginBtn').onclick = async () => {
    const username = document.getElementById('loginLogin').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if(!username || !password){ 
        showToast('Введите логин и пароль', true); 
        return; 
    }
    
    try {
        // Теперь мы вызываем глобальную функцию login, передавая ей username
        await login(username, password);
        document.getElementById('authModal').classList.remove('show');
    } catch(e) {
        // Добавлен вывод ошибки, чтобы вы видели, если бэкенд не отвечает
        console.error("Login failed:", e);
        showToast(e.message || 'Произошла ошибка при авторизации', true);
    }
};
document.getElementById('closeAuthBtn').onclick = () => document.getElementById('authModal').classList.remove('show');
document.getElementById('viewProfileBtn').onclick = () => { document.querySelectorAll('.dropdown-menu').forEach(m=>m.classList.remove('show')); switchPage('profile'); };
document.getElementById('backToMapBtn').onclick = () => switchPage('map');

// --- Dropdowns ---
function setupDropdown(btnId,menuId){ const btn=document.getElementById(btnId), menu=document.getElementById(menuId); if(btn&&menu) btn.onclick=(e)=>{ e.stopPropagation(); document.querySelectorAll('.dropdown-menu').forEach(m=>m.classList.remove('show')); menu.classList.toggle('show'); }; }
setupDropdown('notifBtn','notifMenu'); setupDropdown('profileBtn','profileMenu');
document.addEventListener('click',()=>document.querySelectorAll('.dropdown-menu').forEach(m=>m.classList.remove('show')));
document.getElementById('clearAllNotifBtn')?.addEventListener('click',()=>{ notifications=[]; saveToLocal(); updateNotificationsUI(); showToast('Уведомления очищены'); });

// --- Уведомления (локальные) ---
let notifications = JSON.parse(localStorage.getItem('officeNotifications')) || [];
function addNotification(text) { notifications.unshift({ id: Date.now(), text, time: new Date().toLocaleTimeString(), read: false }); if (notifications.length > 30) notifications.pop(); saveToLocal(); updateNotificationsUI(); }
function updateNotificationsUI() { const c = document.getElementById('notificationsList'); const b=document.getElementById('notifBadge'); if(b){b.style.display=notifications.length?'flex':'none'; b.textContent=notifications.length;} if (!c) return; if (notifications.length === 0) { c.innerHTML = '<div class="dropdown-item" style="color:var(--ibs-text-light);">Нет уведомлений</div>'; return; } c.innerHTML = notifications.slice(0,15).map(n => `<div class="dropdown-item"><div>${escapeHtml(n.text)}</div><div style="font-size:0.7rem;color:var(--ibs-text-light);">${n.time}</div></div>`).join(''); }
function saveToLocal() { localStorage.setItem('officeNotifications', JSON.stringify(notifications)); }

// --- Фильтры ---
document.getElementById('globalDateFilter').valueAsDate = new Date();
document.getElementById('globalDateFilter').addEventListener('change',()=>{ renderMap(); renderCalendar(); });
document.getElementById('globalStartFilter').addEventListener('change',()=>renderMap());
document.getElementById('globalEndFilter').addEventListener('change',()=>renderMap());
document.getElementById('officeSelect').addEventListener('change',()=>renderMap());
document.getElementById('floorSelect').addEventListener('change',()=>renderMap());
document.querySelectorAll('.menu-item').forEach(el=>el.addEventListener('click',()=>switchPage(el.dataset.page)));
document.getElementById('prevMonthBtn').onclick = () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1); renderCalendar(); };
document.getElementById('nextMonthBtn').onclick = () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1); renderCalendar(); };

// --- Зум ---
function zoomIn(){ if(currentZoom < MAX_ZOOM){ currentZoom = Math.min(+(currentZoom + 0.1).toFixed(1), MAX_ZOOM); updateZoomDisplay(); } }
function zoomOut(){ if(currentZoom > MIN_ZOOM){ currentZoom = Math.max(+(currentZoom - 0.1).toFixed(1), MIN_ZOOM); updateZoomDisplay(); } }
function resetZoom(){ currentZoom = 1.0; updateZoomDisplay(); const w = document.getElementById('mapWrapper'); if(w){ w.scrollLeft = 0; w.scrollTop = 0; } showToast('Масштаб сброшен'); }
function updateZoomDisplay(){ const inner = document.getElementById('mapInner'); if(inner) inner.style.transform = `scale(${currentZoom})`; const lvl = document.getElementById('zoomLevel'); if(lvl) lvl.innerText = Math.round(currentZoom * 100) + '%'; }

// --- Инициализация данных карты ---
if (!localStorage.getItem('data_fixed')) {
    localStorage.removeItem('floor_spb_5');
    localStorage.removeItem('floor_spb_3');
    localStorage.setItem('data_fixed', 'true');
}
const initialData = loadFloorData('spb_5');
infraObjects = initialData.infra || [];
chairs = initialData.chairs || [];
meetingRooms = initialData.meetingRooms || [];
recreation = initialData.recreation || [];
if (typeof defaultFloorData !== 'undefined' && defaultFloorData.spb_5 && defaultFloorData.spb_5.chairs) {
    if (chairs.length === 0) {
        chairs = [...defaultFloorData.spb_5.chairs];
        infraObjects = [...(defaultFloorData.spb_5.infra || [])];
        meetingRooms = [...(defaultFloorData.spb_5.meetingRooms || [])];
        recreation = [...(defaultFloorData.spb_5.recreation || [])];
        saveCurrentFloor();
    }
}

// --- Автологин и загрузка данных ---
loadCurrentUser();
if (currentUser) {
    // Загружаем пользователей и брони, обновляем UI
    (async function() {
        await loadUsers();
        await loadBookings();
        updateAuthUI();
        renderMap();
        renderCalendar();
        renderAdminPanel();
        showToast(`Добро пожаловать, ${currentUser.fullName}!`, false);
    })();
} else {
    // Гость
    updateAuthUI();
    renderMap();
    renderCalendar();
}
switchPage('map');

// --- Логотип IBS (оставляем как было) ---
const ibsLogoImg = new Image();
ibsLogoImg.onload = function(){ const ml = document.getElementById('menuLogoContainer'); if(ml){ ml.innerHTML = ''; ml.style.background = 'transparent'; const img = document.createElement('img'); img.src = 'assets/ibs-logo.png'; img.style.cssText = 'width:44px;height:44px;object-fit:contain;border-radius:12px;'; ml.appendChild(img); } const hl = document.getElementById('headerLogoContainer'); if(hl){ hl.innerHTML = ''; hl.style.background = 'transparent'; const img2 = document.createElement('img'); img2.src = 'assets/ibs-logo.png'; img2.style.cssText = 'width:48px;height:48px;object-fit:contain;border-radius:14px;'; hl.appendChild(img2); } };
ibsLogoImg.src = 'assets/ibs-logo.png';