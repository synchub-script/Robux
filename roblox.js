// roblox.js — быстрый поиск Roblox-пользователя
// Параллельные запросы к прямым API + прокси (кто первый — тот и выиграл)

const ROBLOX_APIS = {
  userByName: 'https://users.roblox.com/v1/usernames/users',
  userById:   'https://users.roblox.com/v1/users/',
  avatar:     'https://thumbnails.roblox.com/v1/users/avatar-headshot',
  avatarFull: 'https://thumbnails.roblox.com/v1/users/avatar',
  friends:    'https://friends.roblox.com/v1/users/',
  search:     'https://users.roblox.com/v1/users/search',
};

const PROXIES = [
  (u) => u,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

async function fastFetch(url, options = {}) {
  const tries = PROXIES.map((p) =>
    fetch(p(url), options).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    })
  );
  return await Promise.any(tries);
}

async function findRobloxUser(username) {
  const body = JSON.stringify({
    usernames: [username],
    excludeBannedUsers: false,
  });

  const res = await fastFetch(ROBLOX_APIS.userByName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    throw new Error('Пользователь «' + username + '» не найден');
  }
  return data.data[0];
}

async function getRobloxUserDetails(userId) {
  try {
    const res = await fastFetch(ROBLOX_APIS.userById + userId);
    return await res.json();
  } catch {
    return null;
  }
}

async function getRobloxAvatar(userId) {
  const url = `${ROBLOX_APIS.avatar}?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fastFetch(url);
      const data = await res.json();
      const item = data.data?.[0];
      if (item?.state === 'Completed' && item.imageUrl) return item.imageUrl;
      if (item?.state === 'Pending') {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
    } catch { /* retry */ }
  }
  return null;
}

async function getRobloxAvatarFull(userId) {
  const url = `${ROBLOX_APIS.avatarFull}?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
  try {
    const res = await fastFetch(url);
    const data = await res.json();
    const item = data.data?.[0];
    if (item?.state === 'Completed') return item.imageUrl;
  } catch {}
  return null;
}

async function getRobloxFriendsCount(userId) {
  try {
    const res = await fastFetch(ROBLOX_APIS.friends + userId + '/friends/count');
    const data = await res.json();
    return data.count ?? null;
  } catch {
    return null;
  }
}

async function searchRobloxUsers(keyword, limit = 6) {
  try {
    const url = `${ROBLOX_APIS.search}?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    const res = await fastFetch(url);
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}
