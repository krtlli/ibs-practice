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

    if (!username) {
        loginError.textContent = 'Введите логин';
        return;
    }

    if (!password) {
        loginError.textContent = 'Введите пароль';
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            loginError.textContent =
                data.detail || 'Ошибка авторизации';
            return;
        }

        const userData = {
            username: username,
            token: data.token,
            isAdmin: data.is_admin
        };

        localStorage.setItem(
            'officeUser',
            JSON.stringify(userData)
        );

        modalOverlay.style.display = 'none';
        loginForm.reset();

        alert(
            `✅ Успешный вход! ${
                data.is_admin
                    ? 'Администратор'
                    : 'Сотрудник'
            }`
        );

        window.location.href = 'base.html';
    } catch (error) {
        console.error(error);
        loginError.textContent =
            'Не удалось подключиться к серверу';
    }
});