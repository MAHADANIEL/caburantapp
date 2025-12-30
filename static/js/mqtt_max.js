/**
 * MQTT_MAX : Réception et dispatching des données
 * Ce script écoute les messages entrants et met à jour les interfaces
 */

document.addEventListener('DOMContentLoaded', () => {
    const canalReception = new BroadcastChannel('flux_carburant');

    canalReception.onmessage = (event) => {
        const data = event.data;
        console.log("📥 Donnée reçue sur le Dashboard Admin :", data);

        // 1. Si nous sommes sur le Dashboard (Supervision)
        if (typeof mettreAJourDashboard === "function") {
            mettreAJourDashboard(data);
        }

        // 2. Si nous sommes sur la page Stats (Analyse IA)
        if (typeof traiterFluxEntrant === "function") {
            traiterFluxEntrant(data);
        }

        // 3. Alerte sonore de notification pour le patron
        notifierReception();
    };
});

function notifierReception() {
    // Un petit bip ou une notification visuelle peut être ajouté ici
    console.log("🔔 Nouvelle notification : Une livraison vient d'être enregistrée.");
}