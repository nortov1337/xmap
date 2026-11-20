// ВНУТРЕННЯЯ функция — тут происходит ошибка
async function load() {
  const data = await fetch('https://нет-такого-сайта.xyz');
  return data;
}

// ВНЕШНИЙ код — тот, кто вызвал load()
load()
  .then(data => console.log(data))
  .catch(err => console.log('Поймал ошибку:', err));