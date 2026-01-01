/** * NAVIGATION : Fonction globale pour aller aux stats
 */
window.goToStats = function() {
    const user = document.getElementById('usernameDisplay').textContent;
    window.location.href = "stats_employee.html?user=" + encodeURIComponent(user);
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Récupération de l'utilisateur depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user') || 'Employé';
    document.getElementById('usernameDisplay').textContent = user;

    // --- VARIABLES DE STOCK (Priorité au LocalStorage) ---
    let stockInitial = parseFloat(localStorage.getItem('stockInitial')) || 0;
    let stockActuel = parseFloat(localStorage.getItem('stockActuel')) || 0;

    // --- AFFICHAGE INITIAL ---
    function rafraichirInterface() {
        if (stockInitial > 0) {
            document.getElementById('initialStock').textContent = stockInitial.toFixed(2) + " L";
            document.getElementById('currentStockText').textContent = stockActuel.toFixed(2);
            document.getElementById('totalDispensed').textContent = (stockInitial - stockActuel).toFixed(2) + " L";
            
            const pct = (stockActuel / stockInitial) * 100;
            const bar = document.getElementById('fuelLevelBar');
            if(bar) {
                bar.style.width = pct + "%";
                if (pct < 20) bar.style.backgroundColor = "#e74c3c";
                else if (pct < 50) bar.style.backgroundColor = "#f1c40f";
                else bar.style.backgroundColor = "#1E90FF";
            }
        }
    }

    // Lancement au démarrage
    rafraichirInterface();

    // Variables pour le lissage
    let historiqueMesures = []; 
    const TAILLE_MOYENNE = 5; 
    const SEUIL_TOLERANCE = 0.01;

    /**
     * RÉCEPTION : Mise à jour par le capteur ESP8266
     */
    window.updateFromESP = function(litres) {
        historiqueMesures.push(litres);
        if (historiqueMesures.length > TAILLE_MOYENNE) historiqueMesures.shift();
        let volumeLisse = historiqueMesures.reduce((a, b) => a + b, 0) / historiqueMesures.length;

        if (stockInitial === 0 || stockInitial < volumeLisse) {
            stockInitial = volumeLisse;
            localStorage.setItem('stockInitial', stockInitial);
        }

        let diff = Math.abs(volumeLisse - stockActuel);
        if (diff > SEUIL_TOLERANCE) {
            stockActuel = volumeLisse;
            localStorage.setItem('stockActuel', stockActuel);
            
            // Synchro Admin
            const canalAdmin = new BroadcastChannel('flux_carburant');
            canalAdmin.postMessage({ type: "MAJ_NIVEAU_CAPTEUR", volumeActuel: stockActuel });
            canalAdmin.postMessage({ type: "INITIALISATION_CITERNE", volumeMax: stockInitial });
        }
        rafraichirInterface();
    };

    /**
     * BOUTON : Démarrer la livraison (Saisie Manuelle)
     */
    document.getElementById('startDispenseBtn').addEventListener('click', () => {
        const client = document.getElementById('clientCompany').value.trim();
        const qty = parseFloat(document.getElementById('litersToDispense').value);

        if (!client || isNaN(qty) || qty <= 0) {
            alert("Veuillez saisir un client et une quantité valide.");
            return;
        }

        if (stockActuel >= qty) {
            // SOUSTRACTION PHYSIQUE
            stockActuel = stockActuel - qty;
            
            // SAUVEGARDE
            localStorage.setItem('stockActuel', stockActuel);

            // MISE À JOUR VISUELLE IMMÉDIATE
            rafraichirInterface();

            // ENVOI À L'ADMIN (Très important pour son total distribué)
            const canalAdmin = new BroadcastChannel('flux_carburant');
            canalAdmin.postMessage({
                type: "MAJ_NIVEAU_CAPTEUR",
                volumeActuel: stockActuel
            });

            // LOGIQUE DE LIVRAISON (API + RECU)
            const transmissionData = {
                type: "NOUVELLE_LIVRAISON",
                livreur: user,
                client: client,
                volume: qty.toString(),
                date: new Date().toLocaleString('fr-FR')
            };

            canalAdmin.postMessage(transmissionData);

            let historique = JSON.parse(localStorage.getItem('stats_perso') || '[]');
            historique.push(transmissionData);
            localStorage.setItem('stats_perso', JSON.stringify(historique));

            fetch('http://127.0.0.1:5000/api/livraison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transmissionData)
            }).catch(err => console.error("Erreur Backend:", err));

            showReceipt(client, qty);
            document.getElementById('clientCompany').value = "";
            document.getElementById('litersToDispense').value = "";
        } else {
            alert("Erreur : Stock insuffisant (" + stockActuel.toFixed(2) + " L restants)");
        }
    });
});

function showReceipt(client, qty) {
    const now = new Date();
    document.getElementById('r_employee').textContent = document.getElementById('usernameDisplay').textContent;
    document.getElementById('r_client').textContent = client;
    document.getElementById('r_liters').textContent = qty;
    document.getElementById('r_date').textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    document.getElementById('receiptModal').style.display = "flex";
}

function closeModal() {
    document.getElementById('receiptModal').style.display = "none";
}

function exportReceiptPDF() {
    const element = document.getElementById('printableReceipt');
    const clientName = document.getElementById('r_client').textContent;
    const opt = {
        margin: 15,
        filename: `Recu_${clientName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// --- AJOUT : FONCTION DE DÉCONNEXION ---
function logout() {
    window.location.href = "index.html";
}