/**
 * MQTT_MIN : Gestion de l'envoi des données
 * Ce script simule l'envoi d'un message MQTT vers le dashboard admin
 */

const TransportCarburant = {
    // Fonction pour envoyer une livraison réelle
    envoyerLivraison: function(livreur, client, volume) {
        const payload = {
            type: "NOUVELLE_LIVRAISON",
            livreur: livreur,
            client: client,
            volume: volume,
            date: new Date().toLocaleString('fr-FR')
        };

        // Envoi via BroadcastChannel (permet de communiquer entre deux onglets/pages)
        const canal = new BroadcastChannel('flux_carburant');
        canal.postMessage(payload);
        
        console.log("🚀 Donnée envoyée au serveur :", payload);
    }
};