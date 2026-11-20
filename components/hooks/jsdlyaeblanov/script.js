const promise = new Promise((resolve, reject) => {
  // тут делаем медленную работу
  const pirogGotov = true;

  if (pirogGotov) {
    resolve("Вкусный пирог 🥧");   // "всё ок, вот результат"
  } else {
    reject("Пирог сгорел 🔥");     // "ошибка, вот причина"
  }
}); 

promise
  .then((result) => {
    console.log("Ура:", result); // выполнится, когда fulfilled
  })
  .catch((error) => {
    console.log("Ой:", error);   // выполнится, когда rejected
  });