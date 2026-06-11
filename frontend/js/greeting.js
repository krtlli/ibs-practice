const modalOverlay = document.getElementById('modalOverlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const submitBtn = document.querySelector('.submit-btn');

function showButtonError() {
    submitBtn.classList.remove('error');
    void submitBtn.offsetWidth; // перезапуск анимации
    submitBtn.classList.add('error');
    setTimeout(() => {
        submitBtn.classList.remove('error');
    }, 1000);
}

openModalBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'flex';
    loginError.textContent = '';
});
closeModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
window.addEventListener('click', (event) => {
    if (event.target === modalOverlay) modalOverlay.style.display = 'none';
});

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.textContent = '';

    if (!username) {
        errorDiv.textContent = 'Введите логин';
        showButtonError();
        return;
    }
    if (!password) {
        errorDiv.textContent = 'Введите пароль';
        showButtonError();
        return;
    }
    if (!role) {
        errorDiv.textContent = 'Выберите роль';
        showButtonError();
        return;
    }

    if (role === 'admin') {
        if (username === 'admin' && password === '1234') {
            const userData = {
                name: 'Admin',
                email: 'admin@ibs.ru',
                role: 'admin',
                isAdmin: true
            };
            localStorage.setItem('officeUser', JSON.stringify(userData));

            let employees = JSON.parse(localStorage.getItem('officeEmployees')) || [];
            if (!employees.some(emp => emp.name === 'Admin')) {
                employees.push({
                    id: 1,
                    name: 'Admin',
                    email: 'admin@ibs.ru',
                    password: '1234',
                    isAdmin: true
                });
                localStorage.setItem('officeEmployees', JSON.stringify(employees));
            }

            modalOverlay.style.display = 'none';
            loginForm.reset();
            alert('✅ Успешный вход! Добро пожаловать, администратор.');
            window.location.href = 'base.html';
        } else {
            errorDiv.textContent = 'Неверный логин или пароль администратора';
            showButtonError();
        }
    } else if (role === 'employee') {
        if (password.length < 1) {
            errorDiv.textContent = 'Введите пароль для входа';
            showButtonError();
            return;
        }

        const userData = {
            name: username,
            email: `${username.toLowerCase()}@ibs.ru`,
            role: 'employee',
            isAdmin: false
        };
        localStorage.setItem('officeUser', JSON.stringify(userData));

        let employees = JSON.parse(localStorage.getItem('officeEmployees')) || [];
        if (!employees.some(emp => emp.name === username)) {
            employees.push({
                id: Date.now(),
                name: username,
                email: `${username.toLowerCase()}@ibs.ru`,
                password: password || 'user123',
                isAdmin: false
            });
            localStorage.setItem('officeEmployees', JSON.stringify(employees));
        }

        modalOverlay.style.display = 'none';
        loginForm.reset();
        alert(`✅ Успешный вход! Добро пожаловать, сотрудник ${username}.`);
        window.location.href = 'base.html';
    }
});