// Utilisation de 'var' pour éviter l'erreur "already declared" au rafraîchissement
var adminChart;
var totalDistribue = 0;
var stockRestant = 0; // Initialisé à 0, sera fixé par le capteur
var stockInitialAdmin = 0; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialisation du graphique
    const ctx = document.getElementById('adminLiveChart').getContext('2d');
    adminChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ 
                label:'Niveau de Cuve (L)', 
                data: [], 
                borderColor: '#1E90FF', 
                backgroundColor: 'rgba(30,144,255,0.1)', 
                fill: true, 
                tension: 0.4 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // --- AJOUT : RÉCUPÉRATION MÉMOIRE CACHÉE AU F5 ---
    const storedInit = localStorage.getItem('stockInitial');
    const storedActuel = localStorage.getItem('stockActuel');
    if (storedInit) {
        stockInitialAdmin = parseFloat(storedInit);
        stockRestant = parseFloat(storedActuel) || stockInitialAdmin;
        if(document.getElementById('admInit')) document.getElementById('admInit').textContent = stockInitialAdmin.toFixed(2) + " L";
        if(document.getElementById('admRest')) document.getElementById('admRest').textContent = stockRestant.toFixed(2) + " L";
        
        let memoireDist = stockInitialAdmin - stockRestant;
        if(document.getElementById('admDist')) document.getElementById('admDist').textContent = memoireDist.toFixed(2) + " L";
        updateAdminChart("Mémoire", stockRestant);
    }

    // --- CHARGEMENT HISTORIQUE ---
    fetch('http://127.0.0.1:5000/api/historique')
        .then(res => res.json())
        .then(data => {
            data.reverse().forEach(liv => addLogToAdmin(liv));
        })
        .catch(err => console.log("Serveur indisponible"));

    // --- RÉCUP CONFIG STOCK DB ---
    fetch('http://127.0.0.1:5000/api/get_config_stock')
        .then(res => res.json())
        .then(data => {
            if (data.stock_initial > 0) {
                stockInitialAdmin = data.stock_initial;
                if(document.getElementById('admInit')) document.getElementById('admInit').textContent = stockInitialAdmin.toFixed(2) + " L";
                if (stockRestant === 0) {
                    stockRestant = stockInitialAdmin;
                    if(document.getElementById('admRest')) document.getElementById('admRest').textContent = stockRestant.toFixed(2) + " L";
                }
            }
        });

    // 2. Écouteur de messages
    const bc = new BroadcastChannel('flux_carburant');
    bc.onmessage = (e) => {
        if (e.data.type === "INITIALISATION_CITERNE") {
            stockInitialAdmin = e.data.volumeMax;
            stockRestant = e.data.volumeMax;
            if(document.getElementById('admInit')) document.getElementById('admInit').textContent = stockInitialAdmin.toFixed(2) + " L";
            if(document.getElementById('admRest')) document.getElementById('admRest').textContent = stockRestant.toFixed(2) + " L";
            if(document.getElementById('admDist')) document.getElementById('admDist').textContent = "0.00 L";
        }

        if (e.data.type === "MAJ_NIVEAU_CAPTEUR") {
            stockRestant = e.data.volumeActuel;
            if(document.getElementById('admRest')) document.getElementById('admRest').textContent = stockRestant.toFixed(2) + " L";
            
            // --- AJOUT : CALCUL DU DISTRIBUÉ TOTAL PAR SOUSTRACTION ---
            if (stockInitialAdmin > 0) {
                let calculTotal = stockInitialAdmin - stockRestant;
                if(document.getElementById('admDist')) document.getElementById('admDist').textContent = calculTotal.toFixed(2) + " L";
            }
            updateAdminChart("Update", stockRestant);
        }

        if (e.data.type === "NOUVELLE_LIVRAISON") {
            addLogToAdmin(e.data);
        }
    };

    window.addEventListener("message", (e) => {
        if(e.data.type === "NEW_REC" || e.data.type === "NOUVELLE_LIVRAISON") {
            addLogToAdmin(e.data);
        }
    });
});

function updateAdminChart(label, value) {
    adminChart.data.labels.push(label);
    adminChart.data.datasets[0].data.push(value);
    if(adminChart.data.labels.length > 10) { 
        adminChart.data.labels.shift(); 
        adminChart.data.datasets[0].data.shift(); 
    }
    adminChart.update();
}

function addLogToAdmin(data) {
    const vol = parseFloat(data.volume);
    totalDistribue += vol;
    
    if(document.getElementById('admDist')) {
        let affichageDist = stockInitialAdmin - stockRestant;
        document.getElementById('admDist').textContent = affichageDist.toFixed(2) + " L";
    }
    if(document.getElementById('admRest')) document.getElementById('admRest').textContent = stockRestant.toFixed(2) + " L";

    const receiptData = JSON.stringify(data).replace(/"/g, '&quot;');
    const row = `<tr>
        <td><b>${data.livreur}</b></td>
        <td>${data.client}</td>
        <td><strong>${data.volume} L</strong></td>
        <td>${data.date.split(' ')[1] || data.date}</td>
        <td>
            <button class="btn-pdf" onclick="ouvrirRecu('${receiptData}')" style="background:#1E90FF; color:white; border:none; padding:6px 12px; border-radius:8px;">
                <i class="fas fa-file-invoice"></i> Détails
            </button>
        </td>
    </tr>`;
    document.getElementById('adminLogBody').insertAdjacentHTML('afterbegin', row);
    updateAdminChart("Livraison", stockRestant);
}

function ouvrirRecu(jsonStr) {
    const data = JSON.parse(jsonStr);
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    printWindow.document.write(`<html><body><h2>Reçu ${data.client}</h2><p>Volume: ${data.volume}L</p></body></html>`);
}

function filterTable() {
    let input = document.getElementById("filterInput").value.toUpperCase();
    let tr = document.getElementById("adminTable").getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        tr[i].style.display = tr[i].innerText.toUpperCase().includes(input) ? "" : "none";
    }
}

// --- AJOUT : FONCTION DE DÉCONNEXION ---
function logout() {
    window.location.href = "index.html";
}