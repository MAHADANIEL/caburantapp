const GEMINI_API_KEY = "AIzaSyB5Y1CmoJpmoSFHySVsYfmorJvDOUyrQrA"; 
// MISE À JOUR DE L'URL (On utilise ton serveur Render)
const BASE_URL = "https://caburantapp.onrender.com"; 

let evolutionChart;
let totalVolumeCumule = 0;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialisation du graphique
    const ctx = document.getElementById('evolutionChart').getContext('2d');
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Volume Cumulé (L)', 
                data: [], 
                borderColor: '#8e44ad', 
                tension: 0.4, 
                fill: true, 
                backgroundColor: 'rgba(142,68,173,0.1)' 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. CHARGEMENT INITIAL DEPUIS LE SERVEUR RENDER
    chargerDonneesDepuisServeur();

    // 3. ÉCOUTEUR EN TEMPS RÉEL (BroadcastChannel remplace window.message)
    const bc = new BroadcastChannel('flux_carburant');
    bc.onmessage = (event) => {
        if (event.data && (event.data.type === "NOUVELLE_LIVRAISON" || event.data.type === "NEW_REC")) {
            traiterFluxEntrant(event.data);
        }
    };

    document.getElementById('aiAdviceBox').innerHTML = '<div class="ai-waiting">Prêt pour analyse IA...</div>';
});

/**
 * Va chercher l'historique sur Render au lieu de localhost
 */
function chargerDonneesDepuisServeur() {
    // Modification de l'URL ici :
    fetch(`${BASE_URL}/api/historique`)
        .then(res => res.json())
        .then(data => {
            // On inverse pour traiter les plus anciens d'abord (pour le graphique cumulé)
            data.reverse().forEach(livraison => {
                traiterFluxEntrant(livraison);
            });
        })
        .catch(err => console.error("Erreur de connexion au serveur Render:", err));
}

function traiterFluxEntrant(data) {
    const vol = parseFloat(data.volume);

    // 1. Journal Historique (on évite les doublons visuels si possible)
    const masterBody = document.getElementById('masterLogBody');
    if (!masterBody) return;

    const row = `<tr>
        <td>${data.date}</td>
        <td><strong>${data.livreur}</strong></td>
        <td>${data.client}</td>
        <td><b style="color:#8e44ad">${vol} L</b></td>
        <td><button class="btn-detail" style="border-radius:8px; padding:4px 10px; cursor:pointer;">Détails</button></td>
    </tr>`;
    masterBody.insertAdjacentHTML('afterbegin', row);

    // 2. Performances Employés
    updatePerfTable(data.livreur, vol);

    // 3. Graphique & Prédiction
    totalVolumeCumule += vol;
    // On prend juste l'heure pour le label du graphique
    const labelTemps = data.date.includes(' ') ? data.date.split(' ')[1] : data.date;
    
    evolutionChart.data.labels.push(labelTemps);
    evolutionChart.data.datasets[0].data.push(totalVolumeCumule);
    evolutionChart.update();

    // Mise à jour du badge de prédiction
    if(document.getElementById('predictVol')) {
        document.getElementById('predictVol').textContent = (totalVolumeCumule * 1.15).toFixed(0);
    }

    // 4. Intelligence Artificielle (Seulement pour les nouveaux messages en direct)
    // On évite de lancer 100 appels API au chargement de l'historique
    if (new Date().getTime() - new Date(data.date).getTime() < 5000) { 
        analyserAvecGemini(data);
    }
}

async function analyserAvecGemini(data) {
    const aiBox = document.getElementById('aiAdviceBox');
    if (!aiBox) return;

    aiBox.innerHTML = `<div class="ai-loader"><i class="fas fa-robot fa-spin"></i> Gemini réfléchit...</div>`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = {
        contents: [{ parts: [{
                text: `Tu es un expert logistique. Analyse cette livraison : 
                Livreur: ${data.livreur}, Client: ${data.client}, Volume: ${data.volume} Litres. 
                Donne un conseil stratégique très court (12 mots max) au patron.`
        }]}]
    };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prompt) });
        const result = await response.json();
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            const reponseIA = result.candidates[0].content.parts[0].text;
            aiBox.innerHTML = `<div class="ai-final-text" style="color:#2c3e50; font-weight:500;"><i class="fas fa-check-circle" style="color:#2ecc71"></i> ${reponseIA}</div>`;
        }
    } catch (e) { 
        aiBox.innerHTML = "Erreur IA : Mode hors-ligne."; 
    }
}

function updatePerfTable(nom, vol) {
    const body = document.getElementById('dailyPerformanceBody');
    if(!body) return;
    
    // Nettoyage du nom pour l'ID (pas d'espaces)
    const safeId = `p-${nom.replace(/\s+/g, '')}`;
    let row = document.getElementById(safeId);

    if (row) {
        let currentMissions = parseInt(row.cells[1].textContent);
        let currentVol = parseFloat(row.cells[2].textContent);
        
        row.cells[1].textContent = currentMissions + 1;
        row.cells[2].textContent = (currentVol + vol).toFixed(0) + " L";
    } else {
        body.insertAdjacentHTML('afterbegin', `
            <tr id="${safeId}">
                <td>${nom}</td>
                <td>1</td>
                <td>${vol.toFixed(0)} L</td>
            </tr>`);
    }
}