function updateFavouriteButton(button, favs) {
  const value = Number(button.attributes.getNamedItem('data-id').value);
  const isFav = favs.includes(value);
  console.log(value, favs);
  button.innerText = isFav ? '★' : '☆';
  if(isFav) {
    button.classList.add('faved');
    button.parentElement.parentElement.setAttribute('data-fav', '');
  } else {
    button.classList.remove('faved');
    button.parentElement.parentElement.removeAttribute('data-fav');
  }
}

function updateFavouriteButtons(storeName) {
  const favs = JSON.parse(window.localStorage.getItem(storeName) ?? '[]').map(el => Number(el));
  document.querySelectorAll('button[data-id]').forEach((button) => {
    updateFavouriteButton(button, favs);
  });
}

function createFavsTable(storeName) {
  const favouritesBody = document.getElementById('favourites-body');
  const standingsBody = document.getElementById('standings-body');
  const newChildren = [];
  standingsBody.querySelectorAll('tr[data-fav]').forEach(row => {
    newChildren.push(row.cloneNode(true));
  });
  favouritesBody.replaceChildren(...newChildren);
  favouritesBody.querySelectorAll('button[data-id]').forEach(button => {
    button.addEventListener('click', getFavouriteHandler(storeName));
  });
}

function getFavouriteHandler(storeName) {
  return function (e) {
    let favs = JSON.parse(window.localStorage.getItem(storeName) ?? '[]').map(el => Number(el));
    const value = Number(e.target.attributes.getNamedItem('data-id').value);
    const isFav = !favs.includes(value);
    if(isFav) {
      favs = [...favs, value];
    } else {
      favs = favs.filter(el => el != value);
    }
    console.log(value);
    document.querySelectorAll(`button[data-id="${value}"]`).forEach(button => updateFavouriteButton(button, favs));
    window.localStorage.setItem(storeName, JSON.stringify(favs));
    if(document.getElementById('favourites-body')) {
      createFavsTable(storeName);
    }
  };
}

export { createFavsTable, getFavouriteHandler, updateFavouriteButtons };

