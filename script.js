// Génère les 4 dates (2 samedis + 2 dimanches à partir d'aujourd'hui)
function getNextWeekendDates() {
  const dates = [];
  const today = new Date();
  let day = today.getDay(); // 0=dim, 1=lun, ..., 6=sam
  let date = new Date(today);

  // Trouver le prochain samedi
  if (day <= 6) date.setDate(today.getDate() + (6 - day));
  else date.setDate(today.getDate() + 6);
  dates.push(new Date(date)); // Samedi 1

  date.setDate(date.getDate() + 1);
  dates.push(new Date(date)); // Dimanche 1

  date.setDate(date.getDate() + 6);
  dates.push(new Date(date)); // Samedi 2

  date.setDate(date.getDate() + 1);
  dates.push(new Date(date)); // Dimanche 2

  return dates;
}

const dates = getNextWeekendDates();
const dateOptions = dates.map(d => ({
  date: d.toISOString().split('T')[0],
  label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}));

// Affiche les dates dans le HTML
document.getElementById('dates').textContent = dateOptions.map(d => d.label).join(' | ');

// Gère les boutons de date
const dateButtons = document.getElementById('date-buttons');
dateOptions.forEach((opt, i) => {
  const btn = document.createElement('button');
  btn.className = 'date-btn';
  btn.textContent = opt.label;
  btn.dataset.date = opt.date;
  btn.onclick = () => {
    document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  };
  dateButtons.appendChild(btn);
});

// Charge les votes depuis localStorage
function loadVotes() {
  const votes = JSON.parse(localStorage.getItem('randoVotes')) || [];
  return votes;
}

// Sauvegarde les votes
function saveVotes(votes) {
  localStorage.setItem('randoVotes', JSON.stringify(votes));
}

// Affiche les résultats
function displayResults() {
  const votes = loadVotes();
  const container = document.getElementById('vote-results');
  container.innerHTML = '';

  if (votes.length === 0) {
    container.innerHTML = '<p>Aucun vote pour l\'instant... 😢</p>';
    return;
  }

  votes.forEach(vote => {
    const card = document.createElement('div');
    card.className = 'vote-card';
    card.innerHTML = `
      <div class="avatar">${vote.avatar}</div>
      <div class="pseudo">${vote.pseudo}</div>
      <div class="date">${new Date(vote.date).toLocaleDateString('fr-FR', { weekday: 'short' })} ${vote.date}</div>
    `;
    container.appendChild(card);
  });
}

// Soumission du formulaire
document.getElementById('submit').addEventListener('click', () => {
  const selectedAvatar = document.querySelector('input[name="avatar"]:checked');
  const selectedDate = document.querySelector('.date-btn.selected');
  const pseudo = document.getElementById('pseudo').value.trim();

  if (!selectedAvatar || !selectedDate || !pseudo) {
    alert('⚠️ Il faut choisir un avatar, une date ET un pseudo !');
    return;
  }

  const votes = loadVotes();
  votes.push({
    avatar: selectedAvatar.value,
    date: selectedDate.dataset.date,
    pseudo: pseudo
  });
  saveVotes(votes);

  displayResults();
  document.getElementById('pseudo').value = '';
  document.querySelectorAll('input[name="avatar"]').forEach(r => r.checked = false);
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));

  alert(`✅ ${pseudo} a voté pour le ${selectedDate.textContent} !`);
});

// Initialisation
displayResults();
