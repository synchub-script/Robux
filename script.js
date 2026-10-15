// script.js — основная логика приложения

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1560344628866187288/5ebGdqOjskaYIRPkwlhAUNvXJy4ocbkwwX5cisLNd0ZCKRGDiR9g6wUNKHnn685b1Xje';

const KASPI_PHONE = '4400430056560235';

const state = {
  step: 1,
  amount: 100,
  method: 'Plus',
  rate: 3.2,
  user: null,
  orderNumber: null,
  receiptFile: null,
};

// ==== Элементы ====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const amountDisplay = $('#amount-display');
const amountSlider  = $('#amount-slider');
const totalEl       = $('#total');
const robuxTotalEl  = $('#robux-total');
const balanceEl     = $('#balance');

const nextBtn  = $('#next-btn');
const backBtn  = $('#back-btn');
const navBar   = $('#nav-buttons');
const bottomBar = $('#bottom-bar');

// ==== Формат ====
function formatMoney(n) {
  return n.toLocaleString('ru-RU') + ' ₸';
}

function updateTotal() {
  const total = state.amount * state.rate;
  amountDisplay.textContent = state.amount.toLocaleString('ru-RU');
  totalEl.textContent = formatMoney(Math.round(total));
  robuxTotalEl.textContent = state.amount.toLocaleString('ru-RU');
}

function generateOrderNumber() {
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return 'RBX-' + rnd;
}

// ==== Шаг 1: слайдер и быстрые кнопки ====
amountSlider.addEventListener('input', (e) => {
  state.amount = Number(e.target.value);
  $$('.quick').forEach((b) => b.classList.toggle('active', Number(b.dataset.amount) === state.amount));
  updateTotal();
});

$$('.quick').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.amount = Number(btn.dataset.amount);
    amountSlider.value = state.amount;
    $$('.quick').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    updateTotal();
  });
});

$$('.method').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.method').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.method = btn.dataset.method;
    state.rate = Number(btn.dataset.rate);
    updateTotal();
  });
});

// ==== Навигация по шагам ====
function goToStep(n) {
  state.step = n;
  $$('.step-panel').forEach((p) => p.classList.toggle('hidden', Number(p.dataset.panel) !== n));
  $$('.step-dot').forEach((d) => {
    const s = Number(d.dataset.step);
    d.classList.toggle('active', s === n);
    d.classList.toggle('done', s < n);
  });

  // Кнопки
  backBtn.disabled = n === 1;
  if (n === 1) nextBtn.textContent = 'Продолжить';
  if (n === 2) { nextBtn.textContent = 'Продолжить'; nextBtn.disabled = !state.user; }
  if (n === 3) nextBtn.textContent = 'Отправить заказ';
  if (n === 4) { navBar.classList.add('hidden'); bottomBar.classList.add('hidden'); }

  // Прокрутка вверх карточки
  document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

nextBtn.addEventListener('click', async () => {
  if (state.step === 1) {
    goToStep(2);
  } else if (state.step === 2) {
    if (!state.user) return;
    // Готовим шаг 3
    state.orderNumber = generateOrderNumber();
    $('#order-number').textContent = state.orderNumber;
    $('#kaspi-amount').textContent = formatMoney(Math.round(state.amount * state.rate));
    goToStep(3);
  } else if (state.step === 3) {
    await submitOrder();
  }
});

backBtn.addEventListener('click', () => {
  if (state.step > 1) goToStep(state.step - 1);
});

// ==== Шаг 2: поиск пользователя ====
const usernameInput = $('#username');
const findBtn = $('#find-user');
const userResult = $('#user-result');
const userError = $('#user-error');
const userLoading = $('#user-loading');

async function searchUser() {
  const username = usernameInput.value.trim();
  if (!username) {
    showError('Введите ник');
    return;
  }

  userResult.classList.add('hidden');
  userError.classList.add('hidden');
  userLoading.classList.remove('hidden');
  state.user = null;
  nextBtn.disabled = true;

  try {
    const user = await findRobloxUser(username);
    const avatarUrl = await getRobloxAvatar(user.id);

    state.user = { ...user, avatar: avatarUrl };

    $('#user-name').textContent = user.displayName || user.name;
    $('#user-id').textContent = '@' + user.name + ' · ID: ' + user.id;
    const img = $('#user-avatar');
    img.src = avatarUrl || 'https://tr.rbxcdn.com/53f32d9c6d0d5b4be6e26b1e3d4d1c8f/150/150/AvatarHeadshot/Png';

    userResult.classList.remove('hidden');
    nextBtn.disabled = false;
  } catch (err) {
    showError(err.message || 'Ошибка при поиске пользователя');
  } finally {
    userLoading.classList.add('hidden');
  }
}

function showError(msg) {
  userError.textContent = '⚠️ ' + msg;
  userError.classList.remove('hidden');
}

findBtn.addEventListener('click', searchUser);
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchUser();
});

// ==== Шаг 3: Kaspi + файл ====
const copyBtn = $('#copy-req');
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(KASPI_PHONE);
    copyBtn.textContent = '✅ Скопировано!';
    setTimeout(() => (copyBtn.textContent = '📋 Скопировать номер'), 1800);
  } catch {
    copyBtn.textContent = '❌ Не удалось';
    setTimeout(() => (copyBtn.textContent = '📋 Скопировать номер'), 1800);
  }
});

const receiptInput = $('#receipt');
const uploadLabel = document.querySelector('.upload');
const uploadText = $('#upload-text');

receiptInput.addEventListener('change', () => {
  const f = receiptInput.files[0];
  if (!f) return;
  state.receiptFile = f;
  uploadText.textContent = '📎 ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' КБ)';
  uploadLabel.classList.add('has-file');
});

// ==== Отправка заказа ====
async function submitOrder() {
  nextBtn.disabled = true;
  nextBtn.textContent = 'Отправка...';

  const total = Math.round(state.amount * state.rate);

  const embed = {
    title: '🛒 Новый заказ Robux',
    color: 0x00a2ff,
    fields: [
      { name: '№ Заказа', value: state.orderNumber, inline: true },
      { name: 'Способ', value: state.method, inline: true },
      { name: 'Курс', value: state.rate + ' ₸ / R$', inline: true },
      { name: 'Roblox', value: state.user.name + (state.user.displayName ? ` (${state.user.displayName})` : ''), inline: true },
      { name: 'ID', value: String(state.user.id), inline: true },
      { name: 'Сумма', value: formatMoney(total), inline: true },
      { name: 'Робуксы', value: state.amount.toLocaleString('ru-RU') + ' R$', inline: true },
    ],
    thumbnail: state.user.avatar ? { url: state.user.avatar } : undefined,
    timestamp: new Date().toISOString(),
    footer: { text: 'Kaspi: ' + KASPI_PHONE + ' · Аян Х.' },
  };

  try {
    let response;
    if (state.receiptFile) {
      const fd = new FormData();
      fd.append('payload_json', JSON.stringify({ embeds: [embed] }));
      fd.append('file', state.receiptFile, state.receiptFile.name);
      response = await fetch(WEBHOOK_URL, { method: 'POST', body: fd });
    } else {
      response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

    if (!response.ok) throw new Error('Discord вернул ' + response.status);

    $('#final-order').textContent = state.orderNumber;
    goToStep(4);
  } catch (err) {
    alert('Ошибка отправки: ' + err.message + '\nПроверьте, что прикрепили чек.');
    nextBtn.disabled = false;
    nextBtn.textContent = 'Отправить заказ';
  }
}

// ==== Старт ====
updateTotal();
balanceEl.textContent = '31 814';
