
const favs = {
  storeName: '',
  players: []
};

function saveFavs() {
    window.localStorage.setItem(favs.storeName, JSON.stringify(favs.players));
}

function updateFavouriteButton(button) {
  const value = Number(button.attributes.getNamedItem('data-id').value);
  const isFav = favs.players.includes(value);
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
  favs.storeName = storeName;
  favs.players = JSON.parse(window.localStorage.getItem(storeName) ?? '[]').map(el => Number(el));
  document.querySelectorAll('button[data-id]').forEach((button) => {
    updateFavouriteButton(button, favs.players);
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
    const value = Number(e.target.attributes.getNamedItem('data-id').value);
    const isFav = !favs.players.includes(value);
    if(isFav) {
      favs.players = [...favs.players, value];
      updateFavouriteButton(e.target);
      if(document.getElementById('favourites-body')) {
        createFavsTable(storeName);
      }
    } else {
      favs.players = favs.players.filter(el => el != value);
      document.querySelectorAll(`button[data-id="${value}"]`).forEach(button => updateFavouriteButton(button));
      if(document.getElementById('favourites-body')) {
        document.querySelector(`#favourites-body tr[data-id="${value}"]`).remove();
      }
    }
    saveFavs();
  };
}

export { createFavsTable, getFavouriteHandler, updateFavouriteButtons };

