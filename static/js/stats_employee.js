let chart;
// AJOUT DE L'URL RENDER ICI
const BASE_URL = "https://caburantapp.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Récupération du nom de l'utilisateur
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user') || 'Employé';
    document.getElementById('statUser').textContent = user;

    // 2. Initialisation du Graphique
    const ctx = document.getElementById('liveChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Volume (L)',
                data: [], 
                borderColor: '#1E90FF', 
                fill: true, 
                backgroundColor: 'rgba(30,144,255,0.1)', 
                tension: 0.4 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } } 
        }
    });

    // 3. CHARGEMENT DE L'HISTORIQUE (On privilégie le serveur maintenant)
    chargerHistoriqueDepuisServeur(user);

    // 4. ÉCOUTEUR EN TEMPS RÉEL
    const canal = new BroadcastChannel('flux_carburant');
    canal.onmessage = (e) => {
        if(e.data.type === "NOUVELLE_LIVRAISON" && e.data.livreur === user) {
            ajouterLigneTableau(e.data.client, e.data.volume, "L", e.data.date);
            mettreAJourGraphique(e.data.volume, e.data.date);
        }
    };
});

/**
 * Charge les données depuis Render filtrées par employé
 */
function chargerHistoriqueDepuisServeur(nomEmploye) {
    fetch(`${BASE_URL}/api/historique`)
        .then(res => res.json())
        .then(data => {
            // On filtre les livraisons pour n'afficher que celles de l'employé connecté
            const mesLivraisons = data.filter(l => l.livreur === nomEmploye);
            mesLivraisons.slice(0, 10).reverse().forEach(liv => {
                ajouterLigneTableau(liv.client, liv.volume, "L", liv.date);
                mettreAJourGraphique(liv.volume, liv.date);
            });
        })
        .catch(err => {
            console.error("Erreur serveur Render:", err);
            // Si le serveur est éteint, on tente le localStorage par sécurité
            const stats = JSON.parse(localStorage.getItem('stats_perso') || '[]');
            stats.slice(-10).forEach(liv => {
                ajouterLigneTableau(liv.client, liv.volume, "L", liv.date);
                mettreAJourGraphique(liv.volume, liv.date);
            });
        });
}

/**
 * Ajoute une ligne au tableau HTML
 */
function ajouterLigneTableau(client, volume, unite, date) {
    const historyBody = document.getElementById('historyBody');
    if (!historyBody) return;

    const volStr = `${volume} ${unite}`;
    const row = `<tr>
        <td>${date}</td>
        <td><strong>${client}</strong></td>
        <td style="color:#1E90FF; font-weight:bold;">${volStr}</td>
        <td>
            <button class="btn-pdf" onclick="exporterPDF('${client}','${volStr}','${date}')" style="cursor:pointer; background:#333; color:white; border:none; padding:5px 10px; border-radius:5px;">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
        </td>
    </tr>`;
    historyBody.insertAdjacentHTML('afterbegin', row);
}

/**
 * Met à jour le graphique de performance
 */
function mettreAJourGraphique(volume, date) {
    const heure = date.split(' ')[1] || date;
    chart.data.labels.push(heure);
    chart.data.datasets[0].data.push(parseFloat(volume));

    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update();
}

/**
 * Génération du PDF
 */
function exporterPDF(cli, vol, dat) {
    const template = document.getElementById('receipt-template');
    if(!template) {
        alert("Modèle de reçu introuvable dans le HTML");
        return;
    }

    document.getElementById('p-liv').textContent = document.getElementById('statUser').textContent;
    document.getElementById('p-cli').textContent = cli;
    document.getElementById('p-vol').textContent = vol;
    document.getElementById('p-dat').textContent = dat;

    template.style.display = 'block';
    
    const opt = {
        margin: 10,
        filename: `Recu_${cli}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(template).set(opt).save().then(() => {
        template.style.display = 'none';
    });
}