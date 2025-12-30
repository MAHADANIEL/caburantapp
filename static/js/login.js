const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

// Exemple d'utilisateurs temporaires pour test
const users = [
    {username: "employe1", code: "1234", role: "employee"},
    {username: "employe2", code: "5678", role: "employee"},
    {username: "admin1", code: "admin", role: "admin"}
];

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const code = document.getElementById('code').value.trim();
    
    const selectedRole = document.querySelector('input[name="role"]:checked');
    if (!selectedRole) {
        errorMsg.textContent = "Veuillez sélectionner votre rôle.";
        return;
    }
    const role = selectedRole.value;

    if(username === "" || code === "") {
        errorMsg.textContent = "Veuillez remplir tous les champs.";
        return;
    }

    // Vérification
    const user = users.find(u => u.username === username && u.code === code && u.role === role);

    if(user) {
        // Transition fluide
        document.body.style.transition = "opacity 0.8s";
        document.body.style.opacity = 0;

        setTimeout(() => {
            // CORRECTION : Utilisation des backticks ` pour entourer l'URL
            if(role === 'employee') {
                window.location.href = `dashboard_employee.html?user=${username}`;
            } else {
                window.location.href = `dashboard_admin.html?user=${username}`;
            }
        }, 800);
    } else {
        // Affichage de l'erreur si les identifiants sont faux
        errorMsg.textContent = "Nom, code ou rôle incorrect.";
    }
});