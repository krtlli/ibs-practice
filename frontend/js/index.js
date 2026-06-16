const modalOverlay = document.getElementById('modalOverlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

openModalBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'flex';
    loginError.textContent = '';
});
closeModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target === modalOverlay) modalOverlay.style.display = 'none'; });

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    loginError.textContent = '';

    try {
        // логин
        const loginResp = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const loginData = await loginResp.json();

        if (!loginResp.ok) {
            loginError.textContent =
                loginData.detail || 'Ошибка авторизации';
            return;
        }

        const token = loginData.token;
        const isAdmin = loginData.is_admin;

        // загрузка пользователей
        const usersResp = await fetch('/api/users', {
            headers: {
                'X-Token': token
            }
        });

        let fullName = token;
        let email = '';

        if (usersResp.ok) {
            const users = await usersResp.json();

            const me = users.find(
                u => u.username === token
            );

            if (me) {
                fullName = me.full_name || token;
                email = me.email || '';
            }
        }

        // формат как в base.js
        const currentUser = {
            username: token,
            fullName,
            email,
            isAdmin
        };

        localStorage.setItem(
            'officeUser',
            JSON.stringify(currentUser)
        );

        window.location.href = 'base.html';

    } catch (err) {
        console.error(err);
        loginError.textContent =
            'Не удалось подключиться к серверу';
    }
});