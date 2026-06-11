// ==============================================
// ДАННЫЕ КАРТЫ (инфраструктура + кресла + переговорные + зоны отдыха)
// ==============================================
const defaultFloorData = {
    'spb_5': {
        infra: [
            { id: 'f5_toilet_top', type: 'toilet', label: 'WC', name: 'Туалет (Верхнее крыло)', desc: 'Санитарная зона', x: 28.5, y: 24.5 },
            { id: 'f5_canteen_top', type: 'canteen', label: '☕', name: 'Столовая', desc: 'Зона кухни', x: 28.5, y: 34.0 },
            { id: 'f5_lift', type: 'lift', label: '🛗', name: 'Лифт', desc: 'Лифтовой холл', x: 33.5, y: 82.5 },
            { id: 'f5_printer', type: 'printer', label: '🖨️', name: 'Принтер', desc: 'МФУ', x: 55.0, y: 25.0 }
        ],
        chairs: [
            { id: 'f5_w1', name: 'Рабочее место А-1', type: 'workspace', desc: 'Стол с ПК', available: true, x: 49.0, y: 17.5 },
            { id: 'f5_w2', name: 'Рабочее место А-2', type: 'workspace', desc: 'Стол с ПК', available: true, x: 53.0, y: 17.5 },
            { id: 'f5_w3', name: 'Рабочее место А-3', type: 'workspace', desc: 'Стол с ПК', available: true, x: 49.0, y: 27.0 },
            { id: 'f5_b1', name: 'Рабочее место Б-1', type: 'workspace', desc: 'Open Space', available: true, x: 24.5, y: 41.5 },
            { id: 'f5_b2', name: 'Рабочее место Б-2', type: 'workspace', desc: 'Open Space', available: false, x: 29.0, y: 41.5 },
            { id: 'f5_b3', name: 'Рабочее место Б-3', type: 'workspace', desc: 'Open Space', available: true, x: 33.5, y: 41.5 }
        ],
        meetingRooms: [
            { id: 'f5_meeting_big', name: 'Большая переговорная', desc: 'Вместительная комната до 12 человек', available: true, x: 65.0, y: 45.0, capacity: 12, hasProjector: true, type: 'meeting_room', label: '👥' },
            { id: 'f5_meeting_small', name: 'Малая переговорная', desc: 'Уютная комната до 6 человек', available: true, x: 72.0, y: 55.0, capacity: 6, hasProjector: false, type: 'meeting_room', label: '👥' }
        ],
        recreation: [
            { id: 'f5_playstation', name: 'PlayStation 5', desc: 'Игровая зона с PS5', available: true, x: 80.0, y: 30.0, type: 'playstation', label: '🎮' },
            { id: 'f5_tennis', name: 'Настольный теннис', desc: 'Стол для пинг-понга', available: true, x: 20.0, y: 70.0, type: 'tennis', label: '🏓' },
            { id: 'f5_massage', name: 'Массажное кресло', desc: 'Зона релаксации', available: true, x: 85.0, y: 75.0, type: 'massage', label: '💆' }
        ]
    },
    'spb_3': {
        infra: [
            { id: 'f3_toilet_a', type: 'toilet', label: 'WC', name: 'Туалет', desc: 'Санитарная зона', x: 22.0, y: 30.0 }
        ],
        chairs: [
            { id: 'f3_c1', name: 'Зал А — Место 1', type: 'workspace', desc: 'Рабочее место', available: true, x: 45.0, y: 35.0 },
            { id: 'f3_c2', name: 'Зал А — Место 2', type: 'workspace', desc: 'Рабочее место', available: true, x: 52.0, y: 35.0 },
            { id: 'f3_c3', name: 'Зал А — Место 3', type: 'workspace', desc: 'Рабочее место', available: false, x: 59.0, y: 35.0 }
        ],
        meetingRooms: [
            { id: 'f3_meeting', name: 'Конференц-зал', desc: 'Большой зал для совещаний', available: true, x: 70.0, y: 25.0, capacity: 20, hasProjector: true, type: 'meeting_room', label: '👥' }
        ],
        recreation: [
            { id: 'f3_playstation', name: 'PlayStation', desc: 'Игровая зона', available: true, x: 15.0, y: 70.0, type: 'playstation', label: '🎮' }
        ]
    }
};

function loadFloorData(floorKey) {
    const saved = localStorage.getItem(`floor_${floorKey}`);
    if (saved) return JSON.parse(saved);
    return JSON.parse(JSON.stringify(defaultFloorData[floorKey] || { infra: [], chairs: [], meetingRooms: [], recreation: [] }));
}
function saveFloorData(floorKey, data) { localStorage.setItem(`floor_${floorKey}`, JSON.stringify(data)); }

let currentFloorKey = 'spb_5';
let infraObjects = [], chairs = [], meetingRooms = [], recreation = [];
let nextChairId = Date.now(), nextInfraId = Date.now() + 1, nextMeetingId = Date.now() + 2, nextRecId = Date.now() + 3;
let currentMode = 'view', currentZoom = 1.0;
const MIN_ZOOM = 1.0, MAX_ZOOM = 2.0;
let currentPage = 'map', currentCalendarDate = new Date();
let pendingNewObjectType = null, editingBookingId = null, currentTooltip = null, pendingBookingData = null;
let currentUser = JSON.parse(localStorage.getItem('officeUser')) || null;
let bookings = JSON.parse(localStorage.getItem('officeBookings')) || [];
let notifications = JSON.parse(localStorage.getItem('officeNotifications')) || [];
let currentSelectedItem = null;
let employees = JSON.parse(localStorage.getItem('officeEmployees')) || [];

function isRealAdmin() {
    if (!currentUser) return false;
    if (currentUser.name === 'Admin' && currentUser.isAdmin === true) return true;
    const adminInEmployees = employees.find(e => e.name === 'Admin' && e.isAdmin === true);
    if (adminInEmployees && currentUser.name === 'Admin') return true;
    return false;
}

function saveToLocal() {
    localStorage.setItem('officeBookings', JSON.stringify(bookings));
    localStorage.setItem('officeUser', JSON.stringify(currentUser));
    localStorage.setItem('officeNotifications', JSON.stringify(notifications));
    localStorage.setItem('officeEmployees', JSON.stringify(employees));
}
function saveCurrentFloor() { saveFloorData(currentFloorKey, { infra: infraObjects, chairs: chairs, meetingRooms: meetingRooms, recreation: recreation }); }
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function showToast(msg, isError) { const toast = document.createElement('div'); toast.className = 'toast' + (isError ? ' error' : ''); toast.innerText = msg; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2500); }
function addNotification(text) { notifications.unshift({ id: Date.now(), text, time: new Date().toLocaleTimeString(), read: false }); if (notifications.length > 30) notifications.pop(); saveToLocal(); updateNotificationsUI(); }
function updateNotificationsUI() { const c = document.getElementById('notificationsList'); if (!c) return; if (notifications.length === 0) { c.innerHTML = '<div class="dropdown-item" style="color:#94a3b8;">Нет уведомлений</div>'; return; } c.innerHTML = notifications.slice(0,15).map(n => `<div class="dropdown-item"><div>${escapeHtml(n.text)}</div><div style="font-size:0.7rem;color:#888;">${n.time}</div></div>`).join(''); }

function isItemBooked(itemId, itemType, date, start, end) {
    for (let b of bookings) {
        if (b.spaceId === itemId && b.date === date && start < b.endTime && end > b.startTime) return b;
    }
    return null;
}
function getItemAvailability(itemId, isAvailable, date, start, end) {
    const booking = isItemBooked(itemId, null, date, start, end);
    return { available: booking ? false : isAvailable, booking };
}

function getChairAvailability(chair) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    return getItemAvailability(chair.id, chair.available, date, start, end);
}
function getMeetingRoomAvailability(room) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    return getItemAvailability(room.id, room.available, date, start, end);
}
function getRecreationAvailability(rec) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    return getItemAvailability(rec.id, rec.available, date, start, end);
}

// Поиск ближайших мест ТОЛЬКО для кресел и переговорных (НЕ для зон отдыха)
function findNearestSpaces(objX, objY, limit = 3) {
    const date = document.getElementById('globalDateFilter').value;
    const start = document.getElementById('globalStartFilter').value;
    const end = document.getElementById('globalEndFilter').value;
    const availableChairs = chairs.filter(c => !isItemBooked(c.id, null, date, start, end) && c.available);
    const availableRooms = meetingRooms.filter(r => !isItemBooked(r.id, null, date, start, end) && r.available);
    const allSpaces = [...availableChairs.map(s => ({ ...s, spaceType: 'chair', icon: '💺' })), ...availableRooms.map(s => ({ ...s, spaceType: 'meeting_room', icon: '👥' }))];
    return allSpaces.map(s => ({ ...s, dist: Math.hypot(s.x-objX, s.y-objY) })).sort((a,b)=>a.dist-b.dist).slice(0, limit);
}
function highlightNearestSpaces(objX, objY) {
    document.querySelectorAll('.object-chair, .object-meeting-room').forEach(el => el.classList.remove('chair-highlighted', 'meeting-highlighted'));
    findNearestSpaces(objX, objY, 3).forEach(space => {
        const el = document.getElementById(space.id);
        if (el) {
            if (space.spaceType === 'chair') el.classList.add('chair-highlighted');
            else el.classList.add('meeting-highlighted');
        }
    });
}

function showTooltip(element, item, type) {
    let available, booking;
    if (type === 'chair') { const res = getChairAvailability(item); available = res.available; booking = res.booking; }
    else if (type === 'meeting_room') { const res = getMeetingRoomAvailability(item); available = res.available; booking = res.booking; }
    else { const res = getRecreationAvailability(item); available = res.available; booking = res.booking; }
    const start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    let text = `<strong>${escapeHtml(item.name)}</strong><br>`;
    if (type === 'meeting_room') text += `👥 ${item.capacity} чел.<br>`;
    if (!available && booking) text += `🔴 Занято: ${booking.startTime}—${booking.endTime}<br>👤 ${escapeHtml(booking.userName)}`;
    else text += `🟢 Свободно ${start}—${end}`;
    if (currentTooltip) currentTooltip.remove();
    const tt = document.createElement('div'); tt.className = 'tooltip'; tt.innerHTML = text; document.body.appendChild(tt);
    const rect = element.getBoundingClientRect();
    tt.style.left = (rect.left + rect.width/2 - tt.offsetWidth/2) + 'px';
    tt.style.top = (rect.top - tt.offsetHeight - 8) + 'px';
    currentTooltip = tt;
}
function hideTooltip() { if (currentTooltip) { currentTooltip.remove(); currentTooltip = null; } }

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

function renderAdminPanel() {
    const container = document.getElementById('adminPanelContainer');
    if (!container) return;
    if (!currentUser || !isRealAdmin()) { container.innerHTML = ''; return; }
    container.innerHTML = `<div class="admin-panel"><h3>🔧 Панель администратора</h3><div class="admin-users-list" id="adminUsersList"></div><div class="admin-add-form"><input type="text" id="newEmpName" placeholder="Имя"><input type="email" id="newEmpEmail" placeholder="Email"><input type="text" id="newEmpPass" placeholder="Пароль"><button class="admin-add-btn" id="addEmployeeBtn">➕ Добавить</button></div></div>`;
    renderEmployeeList();
    document.getElementById('addEmployeeBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newEmpName').value.trim();
        const email = document.getElementById('newEmpEmail').value.trim();
        const pass = document.getElementById('newEmpPass').value.trim();
        if (!name || !email || !pass) { showToast('Заполните все поля', true); return; }
        if (employees.some(e => e.name === name || e.email === email)) { showToast('Сотрудник уже существует', true); return; }
        employees.push({ id: Date.now(), name, email, password: pass, isAdmin: false });
        saveToLocal();
        renderAdminPanel();
        showToast(`✅ Сотрудник ${name} добавлен`);
    });
}
function renderEmployeeList() {
    const list = document.getElementById('adminUsersList');
    if (!list) return;
    if (employees.length === 0) { list.innerHTML = '<div style="text-align:center;color:#94a3b8;">Нет сотрудников</div>'; return; }
    list.innerHTML = employees.map(emp => `<div class="admin-user-item"><div class="admin-user-info"><div class="admin-user-name">${escapeHtml(emp.name)} ${emp.isAdmin ? '👑' : ''}</div><div class="admin-user-email">${escapeHtml(emp.email)}</div><div class="admin-user-pass">🔒 ${escapeHtml(emp.password)}</div></div>${!emp.isAdmin ? `<button class="admin-delete-btn" data-id="${emp.id}">🗑 Удалить</button>` : '<span style="font-size:0.7rem;color:#94a3b8;">Админ</span>'}</div>`).join('');
    document.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const toDelete = employees.find(e => e.id === id);
            if (toDelete && !toDelete.isAdmin && confirm(`Удалить сотрудника ${toDelete.name}?`)) {
                employees = employees.filter(e => e.id !== id);
                saveToLocal();
                renderAdminPanel();
                showToast(`❌ ${toDelete.name} удалён`);
            }
        });
    });
}

function renderMap() {
    const office = document.getElementById('officeSelect').value, floor = document.getElementById('floorSelect').value;
    const mapContainer = document.getElementById('mapPage');
    if (office !== 'spb' || !['5','3'].includes(floor)) { mapContainer.innerHTML = `<div class="under-development"><h2>В разработке</h2><p>Карта скоро появится</p></div>`; updateStats(); return; }
    const newKey = `spb_${floor}`;
    if (currentFloorKey !== newKey) switchFloor('spb', floor);
    const imgSrc = floor === '5' ? 'images/floor5.png' : 'images/floor3.png';
    const floorLabels = {'5':'5 этаж — Open Space','3':'3 этаж — Конференц-зал'};
    mapContainer.innerHTML = `<div class="map-container"><div class="map-header"><div class="map-title">🗺️ ${floorLabels[floor]}</div><div class="zoom-controls"><button class="zoom-btn" id="zoomOutBtn">−</button><span class="zoom-level" id="zoomLevel">${Math.round(currentZoom*100)}%</span><button class="zoom-btn" id="zoomInBtn">+</button><button class="zoom-btn" id="resetZoomBtn">⟳</button></div></div><div class="editor-controls"><button id="viewModeBtn" class="mode-btn ${currentMode==='view'?'mode-btn-active':''}">👁 Просмотр</button><button id="moveModeBtn" class="mode-btn move-btn ${currentMode==='move'?'mode-btn-active':''}">↗️ Перемещать</button><button id="deleteModeBtn" class="mode-btn delete-btn-mode ${currentMode==='delete'?'mode-btn-active':''}">🗑 Удалять</button><button id="addObjectBtn" class="mode-btn add-btn">+ Добавить объект</button><button id="resetMapBtn" class="mode-btn reset-map-btn">⟳ Сброс карты</button></div><div class="map-content"><div class="map-area"><div class="map-wrapper" id="mapWrapper"><div class="map-inner" id="mapInner" style="transform:scale(${currentZoom})">${imgSrc ? `<img src="${imgSrc}" class="office-plan-img">` : `<div class="floor-placeholder"><div class="ph-icon">🏢</div><div class="ph-text">${floorLabels[floor]}</div></div>`}<div id="objectsContainer"></div></div></div></div><div class="sidebar" id="sidebar"><div id="sidebarContent"><div class="empty-state">Нажмите на иконку объекта</div></div></div></div></div>`;
    document.getElementById('zoomInBtn').onclick = zoomIn; document.getElementById('zoomOutBtn').onclick = zoomOut; document.getElementById('resetZoomBtn').onclick = resetZoom;
    document.getElementById('viewModeBtn').onclick = () => setMode('view'); document.getElementById('moveModeBtn').onclick = () => setMode('move'); document.getElementById('deleteModeBtn').onclick = () => setMode('delete');
    document.getElementById('addObjectBtn').onclick = () => { document.querySelectorAll('.type-option').forEach(o=>o.classList.remove('selected')); document.getElementById('newObjectName').value=''; pendingNewObjectType=null; document.getElementById('addObjectModal').classList.add('show'); };
    document.getElementById('resetMapBtn').onclick = resetMapToDefault;
    document.getElementById('mapWrapper').addEventListener('wheel', e => { e.preventDefault(); if(e.deltaY<0) zoomIn(); else zoomOut(); }, { passive: false });
    renderObjects(); updateStats();
}

function makeDraggable(el, obj) {
    let dragging=false;
    el.onmousedown=(e)=>{
        if(currentMode!=='move') return;
        e.preventDefault(); e.stopPropagation(); dragging=true; el.style.cursor='grabbing'; document.body.style.userSelect='none';
        const onMove=(e)=>{
            if(!dragging) return;
            const wrap=document.getElementById('mapWrapper'); if(!wrap) return;
            const rect=wrap.getBoundingClientRect();
            let px=((e.clientX-rect.left)/rect.width)*100, py=((e.clientY-rect.top)/rect.height)*100;
            px=Math.min(Math.max(px,2),98); py=Math.min(Math.max(py,2),98);
            obj.x=px; obj.y=py; el.style.left=px+'%'; el.style.top=py+'%';
        };
        const onUp=()=>{ dragging=false; el.style.cursor='grab'; document.body.style.userSelect=''; saveCurrentFloor(); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); showToast('Позиция сохранена'); };
        document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
    };
}

function renderObjects() {
    const c = document.getElementById('objectsContainer'); if(!c) return; c.innerHTML='';
    infraObjects.forEach(obj=>{
        const el=document.createElement('div'); el.id=obj.id; el.className='map-object object-infra'; el.style.left=obj.x+'%'; el.style.top=obj.y+'%'; el.innerHTML=obj.label; el.title=obj.name;
        if(currentMode==='view') el.onclick=(e)=>{ e.stopPropagation(); showInfraInfo(obj); highlightNearestSpaces(obj.x,obj.y); };
        else if(currentMode==='move') makeDraggable(el,obj);
        else if(currentMode==='delete') el.onclick=(e)=>{ e.stopPropagation(); if(confirm('Удалить объект?')){ infraObjects=infraObjects.filter(i=>i.id!==obj.id); saveCurrentFloor(); renderMap(); showToast('Объект удалён',true); } };
        c.appendChild(el);
    });
    meetingRooms.forEach(room=>{
        const {available}=getMeetingRoomAvailability(room);
        const el=document.createElement('div'); el.id=room.id; el.className=`map-object object-meeting-room ${available?'meeting-available':'meeting-occupied'}`; el.style.left=room.x+'%'; el.style.top=room.y+'%'; el.innerHTML=room.label||'👥'; el.title=`${room.name} (${room.capacity} чел.)`;
        if(currentMode==='view'){
            el.onclick=(e)=>{ e.stopPropagation(); showMeetingRoomInfo(room); };
            el.onmouseenter=()=>showTooltip(el,room,'meeting_room'); el.onmouseleave=hideTooltip;
        } else if(currentMode==='move') makeDraggable(el,room);
        else if(currentMode==='delete') el.onclick=()=>{ if(confirm(`Удалить ${room.name}?`)){ meetingRooms=meetingRooms.filter(r=>r.id!==room.id); saveCurrentFloor(); renderMap(); showToast('Переговорная удалена',true); } };
        c.appendChild(el);
    });
    recreation.forEach(rec=>{
        const {available}=getRecreationAvailability(rec);
        const el=document.createElement('div'); el.id=rec.id; el.className=`map-object object-recreation ${available?'rec-available':'rec-occupied'}`; el.style.left=rec.x+'%'; el.style.top=rec.y+'%'; el.innerHTML=rec.label; el.title=rec.name;
        if(currentMode==='view'){
            el.onclick=(e)=>{ e.stopPropagation(); showRecreationInfo(rec); };
            el.onmouseenter=()=>showTooltip(el,rec,rec.type); el.onmouseleave=hideTooltip;
        } else if(currentMode==='move') makeDraggable(el,rec);
        else if(currentMode==='delete') el.onclick=()=>{ if(confirm(`Удалить ${rec.name}?`)){ recreation=recreation.filter(r=>r.id!==rec.id); saveCurrentFloor(); renderMap(); showToast('Зона удалена',true); } };
        c.appendChild(el);
    });
    chairs.forEach(chair=>{
        const {available}=getChairAvailability(chair);
        const el=document.createElement('div'); el.id=chair.id; el.className=`map-object object-chair ${available?'chair-available':'chair-occupied'}`; el.style.left=chair.x+'%'; el.style.top=chair.y+'%'; el.title=chair.name;
        if(currentMode==='view'){
            el.onclick=()=>{ if(available) openBookingModal(chair, 'chair'); else showToast('Это место уже занято',true); };
            el.onmouseenter=()=>showTooltip(el,chair,'chair'); el.onmouseleave=hideTooltip;
        } else if(currentMode==='move') makeDraggable(el,chair);
        else if(currentMode==='delete') el.onclick=()=>{ if(confirm('Удалить рабочее место?')){ chairs=chairs.filter(c=>c.id!==chair.id); saveCurrentFloor(); renderMap(); showToast('Место удалено',true); } };
        c.appendChild(el);
    });
    updateStats();
}

function showInfraInfo(obj) {
    const nearest = findNearestSpaces(obj.x, obj.y, 3);
    let nearestHtml = nearest.length > 0 ? nearest.map(s => `<li class="nearest-item" onclick="window.openBookingModalFromId('${s.id}', '${s.spaceType}')"><div><strong>${escapeHtml(s.name)}</strong><br><span style="font-size:11px;">${s.spaceType === 'chair' ? '💻 Рабочее место' : '👥 Переговорная'}</span><br><span style="font-size:10px;">📏 ${Math.round(s.dist)}%</span></div><button class="btn-book1 animated-btn">Занять</button></li>`).join('') : '<li class="empty-state">Нет свободных мест</li>';
    document.getElementById('sidebarContent').innerHTML = `<div class="info-card"><h3>${escapeHtml(obj.name)}</h3><p>${escapeHtml(obj.desc)}</p><p style="font-size:11px;margin-top:8px;">🕐 ${document.getElementById('globalStartFilter').value}—${document.getElementById('globalEndFilter').value}</p></div><div class="nearest-title">Ближайшие свободные места:</div><ul class="nearest-list">${nearestHtml}</ul>`;
}
function showMeetingRoomInfo(room) {
    const {available, booking} = getMeetingRoomAvailability(room);
    const start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    const status = available ? '<span style="color:#2ecc71;">🟢 Свободна</span>' : `<span style="color:#e74c3c;">🔴 Занята (${booking?.startTime}—${booking?.endTime})</span>`;
    const btn = available ? `<button class="btn-book1 animated-btn" style="margin-top:15px; width:100%;" onclick="openMeetingBookingModal('${room.id}')">Забронировать</button>` : '';
    document.getElementById('sidebarContent').innerHTML = `<div class="info-card"><h3>👥 ${escapeHtml(room.name)}</h3><p>${escapeHtml(room.desc)}</p><p>👥 Вместимость: ${room.capacity} человек</p><p>📽️ Проектор: ${room.hasProjector ? '✅ есть' : '❌ нет'}</p><p>🕐 ${start}—${end}</p><p>${status}</p>${btn}</div>`;
}
function showRecreationInfo(rec) {
    const {available, booking} = getRecreationAvailability(rec);
    const start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    const status = available ? '<span style="color:#2ecc71;">🟢 Свободно</span>' : `<span style="color:#e74c3c;">🔴 Занято (${booking?.startTime}—${booking?.endTime})</span>`;
    const btn = available ? `<button class="btn-book1 animated-btn" style="margin-top:15px; width:100%;" onclick="openRecreationBookingModal('${rec.id}')">Забронировать</button>` : '';
    document.getElementById('sidebarContent').innerHTML = `<div class="info-card"><h3>${rec.label} ${escapeHtml(rec.name)}</h3><p>${escapeHtml(rec.desc)}</p><p>🕐 ${start}—${end}</p><p>${status}</p>${btn}</div>`;
}

function updateStats() {
    const date = document.getElementById('globalDateFilter').value, start = document.getElementById('globalStartFilter').value, end = document.getElementById('globalEndFilter').value;
    let occupied = 0;
    chairs.forEach(c => { if(isItemBooked(c.id, null, date, start, end)) occupied++; });
    meetingRooms.forEach(r => { if(isItemBooked(r.id, null, date, start, end)) occupied++; });
    recreation.forEach(r => { if(isItemBooked(r.id, null, date, start, end)) occupied++; });
    const total = chairs.length + meetingRooms.length + recreation.length;
    document.getElementById('freeCount').innerText = total - occupied;
    document.getElementById('occupiedCount').innerText = occupied;
    document.getElementById('myBookingsCount').innerText = currentUser ? bookings.filter(b => b.userName === currentUser.name).length : 0;
    renderProfileBookingsList();
}

function renderProfileBookingsList() {
    const div = document.getElementById('profileBookingsList');
    if(!div) return;
    if(!currentUser){ div.innerHTML = 'Войдите, чтобы управлять бронями'; return; }
    const ub = bookings.filter(b => b.userName === currentUser.name);
    if(ub.length === 0){ div.innerHTML = 'Нет активных броней'; return; }
    div.innerHTML = ub.map(b => `<div class="booking-item"><div><strong>${escapeHtml(b.spaceName)}</strong><br>${b.date} ${b.startTime}—${b.endTime}${b.invitedUser ? `<br>👥 + ${escapeHtml(b.invitedUser)}` : ''}</div><div class="booking-actions"><button class="btn-edit-booking" onclick="window.editBooking(${b.id})">✏️ Редактировать</button><button class="btn-cancel-booking" onclick="window.cancelBooking(${b.id})">Отменить</button></div></div>`).join('');
}

function openBookingModal(item, type) {
    if(!currentUser){ document.getElementById('authModal').classList.add('show'); return; }
    currentSelectedItem = { id: item.id, name: item.name, type: type };
    document.getElementById('modalSelectedSpace').innerHTML = '📍 ' + escapeHtml(item.name);
    document.getElementById('modalBookingDate').value = document.getElementById('globalDateFilter').value;
    document.getElementById('modalStartTime').value = document.getElementById('globalStartFilter').value;
    document.getElementById('modalEndTime').value = document.getElementById('globalEndFilter').value;
    document.getElementById('inviteUser').value = '';
    document.getElementById('bookingModal').classList.add('show');
}
function openMeetingBookingModal(roomId) { const room = meetingRooms.find(r=>r.id===roomId); if(room) openBookingModal(room, 'meeting_room'); }
function openRecreationBookingModal(recId) { const rec = recreation.find(r=>r.id===recId); if(rec) openBookingModal(rec, rec.type); }
window.openBookingModalFromId = function(id, type) {
    if(type === 'chair') { const c = chairs.find(ch=>ch.id===id); if(c) openBookingModal(c, 'chair'); }
    else if(type === 'meeting_room') { const r = meetingRooms.find(rm=>rm.id===id); if(r) openBookingModal(r, 'meeting_room'); }
};

document.getElementById('confirmBookingBtn').onclick = () => {
    if(!currentSelectedItem) return;
    const date = document.getElementById('modalBookingDate').value, start = document.getElementById('modalStartTime').value, end = document.getElementById('modalEndTime').value, invited = document.getElementById('inviteUser').value.trim();
    if(!date || !start || !end){ showToast('Заполните все поля', true); return; }
    if(start >= end){ showToast('Время окончания должно быть позже начала', true); return; }
    if(isItemBooked(currentSelectedItem.id, null, date, start, end)){ showToast('Это место уже занято', true); return; }
    pendingBookingData = { item: currentSelectedItem, date, start, end, invited };
    document.getElementById('bookingModal').classList.remove('show');
    document.getElementById('confirmPopupInfo').innerHTML = `<strong>${escapeHtml(currentSelectedItem.name)}</strong><br>📅 ${date} · ⏰ ${start}—${end}${invited ? `<br>👥 + ${escapeHtml(invited)}` : ''}`;
    document.getElementById('confirmPopup').classList.add('show');
};
document.getElementById('confirmPopupOkBtn').onclick = () => {
    if(!pendingBookingData) return;
    const { item, date, start, end, invited } = pendingBookingData;
    bookings.push({ id: Date.now(), spaceId: item.id, spaceName: item.name, spaceType: item.type, userName: currentUser.name, date, startTime: start, endTime: end, invitedUser: invited || null, floor: currentFloorKey });
    saveToLocal(); renderMap(); renderCalendar();
    document.getElementById('confirmPopup').classList.remove('show');
    showToast(`✅ ${item.name} забронировано`);
    addNotification(`Вы забронировали ${item.name} на ${date} ${start}–${end}`);
    if(invited) addNotification(`Приглашение отправлено: ${invited}`);
    pendingBookingData = null; currentSelectedItem = null;
};
document.getElementById('confirmPopupCancelBtn').onclick = () => {
    document.getElementById('confirmPopup').classList.remove('show');
    if(currentSelectedItem) document.getElementById('bookingModal').classList.add('show');
    pendingBookingData = null;
};
document.getElementById('closeModalBtn').onclick = () => { document.getElementById('bookingModal').classList.remove('show'); currentSelectedItem = null; pendingBookingData = null; };

window.editBooking = function(id) {
    const b = bookings.find(b => b.id == id);
    if(!b) return;
    editingBookingId = id;
    document.getElementById('editSelectedSpace').innerHTML = '📍 ' + escapeHtml(b.spaceName);
    document.getElementById('editBookingDate').value = b.date;
    document.getElementById('editStartTime').value = b.startTime;
    document.getElementById('editEndTime').value = b.endTime;
    document.getElementById('editInviteUser').value = b.invitedUser || '';
    document.getElementById('editModal').classList.add('show');
};
document.getElementById('saveEditBtn').onclick = () => {
    if(!editingBookingId) return;
    const idx = bookings.findIndex(b => b.id == editingBookingId);
    if(idx === -1) return;
    const nd = document.getElementById('editBookingDate').value, ns = document.getElementById('editStartTime').value, ne = document.getElementById('editEndTime').value, ni = document.getElementById('editInviteUser').value.trim();
    if(!nd || !ns || !ne){ showToast('Заполните поля', true); return; }
    if(ns >= ne){ showToast('Время некорректно', true); return; }
    const old = bookings[idx];
    for(let b of bookings){
        if(b.id != editingBookingId && b.spaceId === old.spaceId && b.date === nd && ns < b.endTime && ne > b.startTime){
            showToast('Уже занято в это время', true); return;
        }
    }
    bookings[idx] = { ...old, date: nd, startTime: ns, endTime: ne, invitedUser: ni || null };
    saveToLocal(); renderMap(); renderCalendar();
    document.getElementById('editModal').classList.remove('show');
    showToast('✅ Бронирование обновлено');
    addNotification(`Бронь ${old.spaceName} изменена на ${nd} ${ns}–${ne}`);
    editingBookingId = null;
};
document.getElementById('closeEditBtn').onclick = () => document.getElementById('editModal').classList.remove('show');
window.cancelBooking = function(id) {
    const b = bookings.find(b => b.id == id);
    if(b && confirm(`Отменить бронь "${b.spaceName}"?`)){ bookings = bookings.filter(b => b.id != id); saveToLocal(); renderMap(); renderCalendar(); showToast('Бронь отменена'); addNotification(`Бронь ${b.spaceName} отменена`); }
};

// Добавление объектов
document.addEventListener('click', (e) => {
    const opt = e.target.closest('.type-option');
    if(opt && document.getElementById('addObjectModal').classList.contains('show')){
        document.querySelectorAll('.type-option').forEach(o=>o.classList.remove('selected'));
        opt.classList.add('selected');
        pendingNewObjectType = { type: opt.dataset.type, label: opt.dataset.label, defaultName: opt.dataset.name };
    }
});
document.getElementById('confirmAddObjectBtn').onclick = () => {
    if(!pendingNewObjectType){ showToast('Выберите тип объекта', true); return; }
    const name = document.getElementById('newObjectName').value.trim();
    const newId = `${pendingNewObjectType.type}_${Date.now()}`;
    if(pendingNewObjectType.type === 'chair'){
        chairs.push({ id: newId, name: name || `Новое место ${chairs.length+1}`, type: 'workspace', desc: 'Новое рабочее место', available: true, x: 50, y: 50 });
        showToast('➕ Добавлено рабочее место');
    } else if(pendingNewObjectType.type === 'meeting_room'){
        meetingRooms.push({ id: newId, name: name || 'Новая переговорная', desc: 'Переговорная', available: true, x: 50, y: 50, capacity: 8, hasProjector: true, type: 'meeting_room', label: '👥' });
        showToast('➕ Добавлена переговорная');
    } else if(['playstation', 'tennis', 'massage'].includes(pendingNewObjectType.type)){
        recreation.push({ id: newId, name: name || pendingNewObjectType.defaultName || 'Зона отдыха', desc: 'Зона отдыха', available: true, x: 50, y: 50, type: pendingNewObjectType.type, label: pendingNewObjectType.label });
        showToast(`➕ Добавлена зона: ${name || pendingNewObjectType.defaultName}`);
    } else {
        infraObjects.push({ id: newId, type: pendingNewObjectType.type, label: pendingNewObjectType.label, name: name || pendingNewObjectType.defaultName || 'Новый объект', desc: 'Объект инфраструктуры', x: 50, y: 50 });
        showToast(`➕ Добавлен: ${name || pendingNewObjectType.defaultName}`);
    }
    saveCurrentFloor(); renderMap();
    document.getElementById('addObjectModal').classList.remove('show');
    pendingNewObjectType = null;
};
document.getElementById('closeAddModalBtn').onclick = () => { document.getElementById('addObjectModal').classList.remove('show'); pendingNewObjectType = null; };

function resetMapToDefault() {
    if(confirm('⚠️ Сбросить карту к исходному состоянию?')){
        const def = defaultFloorData[currentFloorKey];
        if(def){ infraObjects = JSON.parse(JSON.stringify(def.infra || [])); chairs = JSON.parse(JSON.stringify(def.chairs || [])); meetingRooms = JSON.parse(JSON.stringify(def.meetingRooms || [])); recreation = JSON.parse(JSON.stringify(def.recreation || [])); saveCurrentFloor(); renderMap(); showToast('🔄 Карта сброшена'); }
    }
}
function setMode(mode){ currentMode = mode; renderMap(); }
function zoomIn(){ if(currentZoom < MAX_ZOOM){ currentZoom = Math.min(+(currentZoom + 0.1).toFixed(1), MAX_ZOOM); updateZoomDisplay(); } }
function zoomOut(){ if(currentZoom > MIN_ZOOM){ currentZoom = Math.max(+(currentZoom - 0.1).toFixed(1), MIN_ZOOM); updateZoomDisplay(); } }
function resetZoom(){ currentZoom = 1.0; updateZoomDisplay(); const w = document.getElementById('mapWrapper'); if(w){ w.scrollLeft = 0; w.scrollTop = 0; } showToast('Масштаб сброшен'); }
function updateZoomDisplay(){ const inner = document.getElementById('mapInner'); if(inner) inner.style.transform = `scale(${currentZoom})`; const lvl = document.getElementById('zoomLevel'); if(lvl) lvl.innerText = Math.round(currentZoom * 100) + '%'; }

// Календарь с выбором брони
function renderCalendar() {
    const year = currentCalendarDate.getFullYear(), month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById('calendarGrid'); if(!grid) return;
    while(grid.children.length > 7) grid.removeChild(grid.lastChild);
    for(let i = 0; i < startWeekday; i++){ const empty = document.createElement('div'); empty.className = 'calendar-day'; empty.style.background = 'transparent'; grid.appendChild(empty); }
    for(let d = 1; d <= daysInMonth; d++){
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayBookings = bookings.filter(b => b.date === dateStr && (currentUser ? b.userName === currentUser.name : false));
        const div = document.createElement('div'); div.className = 'calendar-day';
        const bookingDots = dayBookings.map(() => `<div class="booking-dot"></div>`).join('');
        div.innerHTML = `<div class="calendar-day-number">${d}</div>${bookingDots}${dayBookings.length > 0 ? '<div class="event-badge">📌</div>' : ''}`;
        div.onclick = () => {
            if(dayBookings.length === 0){
                alert(`📅 Нет броней на ${dateStr}`);
            } else if(dayBookings.length === 1){
                openBookingEditFromCalendar(dayBookings[0]);
            } else {
                let selectHtml = '<div style="margin-bottom:15px;"><select id="bookingSelect" style="width:100%; padding:10px; border-radius:12px; border:1px solid #CBD5E0;">';
                dayBookings.forEach(b => { selectHtml += `<option value="${b.id}">${escapeHtml(b.spaceName)} (${b.startTime}—${b.endTime})</option>`; });
                selectHtml += '</select></div>';
                const modalContent = document.createElement('div');
                modalContent.className = 'booking-modal-content';
                modalContent.innerHTML = `<h3>📋 Бронирования на ${dateStr}</h3>${selectHtml}<div class="modal-buttons"><button class="btn btn-secondary" id="calendarSelectCancelBtn">Отмена</button><button class="btn btn-primary" id="calendarSelectOkBtn">Выбрать</button></div>`;
                const tempModal = document.createElement('div'); tempModal.className = 'booking-modal show'; tempModal.style.display = 'flex'; tempModal.appendChild(modalContent);
                document.body.appendChild(tempModal);
                document.getElementById('calendarSelectOkBtn').onclick = () => {
                    const selectedId = parseInt(document.getElementById('bookingSelect').value);
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
}
function openBookingEditFromCalendar(booking) {
    editingBookingId = booking.id;
    document.getElementById('editSelectedSpace').innerHTML = '📍 ' + escapeHtml(booking.spaceName);
    document.getElementById('editBookingDate').value = booking.date;
    document.getElementById('editStartTime').value = booking.startTime;
    document.getElementById('editEndTime').value = booking.endTime;
    document.getElementById('editInviteUser').value = booking.invitedUser || '';
    document.getElementById('editModal').classList.add('show');
}

function switchPage(page) {
    currentPage = page;
    document.getElementById('mapPage').style.display = page === 'map' ? 'block' : 'none';
    document.getElementById('calendarPage').classList.toggle('show', page === 'calendar');
    document.getElementById('profilePage').classList.toggle('show', page === 'profile');
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    const active = document.querySelector(`[data-page="${page}"]`);
    if(active) active.classList.add('active');
    if(page === 'calendar') renderCalendar();
    if(page === 'profile'){
        document.getElementById('profileName').innerText = currentUser?.name || '—';
        document.getElementById('profileEmail').innerText = currentUser?.email || '—';
        renderProfileBookingsList();
        renderAdminPanel();
    }
}
function updateAuthUI() {
    document.getElementById('menuUserName').innerText = currentUser?.name || 'Гость';
    document.getElementById('menuUserEmail').innerText = currentUser?.email || 'Войдите в систему';
    document.getElementById('menuLoginBtn').style.display = currentUser ? 'none' : 'block';
    document.getElementById('menuLogoutBtn').style.display = currentUser ? 'block' : 'none';
    const header = document.getElementById('profileHeader'), loginBtn = document.getElementById('loginBtnItem'), logoutBtn = document.getElementById('logoutBtnItem');
    if(currentUser){ 
        header.innerHTML = '👤 ' + escapeHtml(currentUser.name) + (isRealAdmin() ? ' (Админ)' : '');
        loginBtn.style.display = 'none'; logoutBtn.style.display = 'flex'; 
    } else { header.innerHTML = 'Профиль'; loginBtn.style.display = 'flex'; logoutBtn.style.display = 'none'; }
    updateStats(); renderAdminPanel();
}

document.getElementById('menuLoginBtn').onclick = () => document.getElementById('authModal').classList.add('show');
document.getElementById('menuLogoutBtn').onclick = () => { currentUser = null; saveToLocal(); localStorage.removeItem('officeUser_already_logged'); showToast('Вы вышли'); setTimeout(()=>window.location.href='index.html',800); };
document.getElementById('loginBtnItem').onclick = () => document.getElementById('authModal').classList.add('show');
document.getElementById('logoutBtnItem').onclick = () => { currentUser = null; saveToLocal(); localStorage.removeItem('officeUser_already_logged'); showToast('Вы вышли'); setTimeout(()=>window.location.href='index.html',800); };
document.getElementById('doLoginBtn').onclick = () => {
    const name = document.getElementById('loginName').value.trim();
    const email = document.getElementById('loginEmail').value.trim();
    if(!name){ showToast('Введите имя', true); return; }
    if(name === 'Admin' && email === 'admin@ibs.ru'){
        currentUser = { name: 'Admin', email: 'admin@ibs.ru', isAdmin: true };
        if(!employees.some(e => e.name === 'Admin')){ employees.push({ id: 1, name: 'Admin', email: 'admin@ibs.ru', password: '1234', isAdmin: true }); }
        saveToLocal();
        document.getElementById('authModal').classList.remove('show'); updateAuthUI(); showToast(`Добро пожаловать, администратор ${name}!`);
        renderMap(); renderCalendar(); renderAdminPanel();
    } else {
        currentUser = { name, email: email || `${name.toLowerCase()}@ibs.ru`, isAdmin: false };
        if(!employees.some(e => e.name === name)){ employees.push({ id: Date.now(), name, email: email || `${name.toLowerCase()}@ibs.ru`, password: 'user123', isAdmin: false }); saveToLocal(); }
        document.getElementById('authModal').classList.remove('show'); updateAuthUI(); showToast(`Добро пожаловать, ${name}!`);
        renderMap(); renderCalendar(); renderAdminPanel();
    }
};
document.getElementById('closeAuthBtn').onclick = () => document.getElementById('authModal').classList.remove('show');
document.getElementById('viewProfileBtn').onclick = () => { document.querySelectorAll('.dropdown-menu').forEach(m=>m.classList.remove('show')); switchPage('profile'); };
document.getElementById('backToMapBtn').onclick = () => switchPage('map');

function setupDropdown(btnId,menuId){ const btn=document.getElementById(btnId), menu=document.getElementById(menuId); if(btn&&menu) btn.onclick=(e)=>{ e.stopPropagation(); document.querySelectorAll('.dropdown-menu').forEach(m=>m.classList.remove('show')); menu.classList.toggle('show'); }; }
setupDropdown('notifBtn','notifMenu'); setupDropdown('profileBtn','profileMenu');
document.addEventListener('click',()=>document.querySelectorAll('.dropdown-menu').forEach(m=>m.classList.remove('show')));
document.getElementById('clearAllNotifBtn')?.addEventListener('click',()=>{ notifications=[]; saveToLocal(); updateNotificationsUI(); showToast('Уведомления очищены'); });

document.getElementById('globalDateFilter').valueAsDate = new Date();
document.getElementById('globalDateFilter').addEventListener('change',()=>{ renderMap(); renderCalendar(); });
document.getElementById('globalStartFilter').addEventListener('change',()=>renderMap());
document.getElementById('globalEndFilter').addEventListener('change',()=>renderMap());
document.getElementById('officeSelect').addEventListener('change',()=>renderMap());
document.getElementById('floorSelect').addEventListener('change',()=>renderMap());
document.querySelectorAll('.menu-item').forEach(el=>el.addEventListener('click',()=>switchPage(el.dataset.page)));
document.getElementById('prevMonthBtn').onclick = () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1); renderCalendar(); };
document.getElementById('nextMonthBtn').onclick = () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1); renderCalendar(); };

updateAuthUI(); updateNotificationsUI(); renderMap(); switchPage('map');

const ibsLogoImg = new Image();
ibsLogoImg.onload = function(){
    const ml = document.getElementById('menuLogoContainer');
    if(ml){ ml.innerHTML = ''; ml.style.background = 'transparent'; const img = document.createElement('img'); img.src = 'images/ibs-logo.png'; img.style.cssText = 'width:44px;height:44px;object-fit:contain;border-radius:12px;'; ml.appendChild(img); }
    const hl = document.getElementById('headerLogoContainer');
    if(hl){ hl.innerHTML = ''; hl.style.background = 'transparent'; const img2 = document.createElement('img'); img2.src = 'images/ibs-logo.png'; img2.style.cssText = 'width:48px;height:48px;object-fit:contain;border-radius:14px;'; hl.appendChild(img2); }
};
(function autoLogin(){ const saved = localStorage.getItem('officeUser'); if(saved && !window.currentUser && !localStorage.getItem('officeUser_already_logged')){ try{ const user = JSON.parse(saved); window.currentUser = user; localStorage.setItem('officeUser_already_logged','true'); updateAuthUI(); renderMap(); renderCalendar(); setTimeout(()=>showToast(`Добро пожаловать, ${user.name}!`),500); }catch(e){} } })();
ibsLogoImg.src = 'images/ibs-logo.png';