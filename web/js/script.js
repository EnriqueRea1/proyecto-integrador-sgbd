const form = document.getElementById('myForm');

form.addEventListener('submit', (event) => {
  event.preventDefault(); // Evita que el formulario se envíe de forma normal

  const nombre = document.getElementById('nombre').value;
  const email = document.getElementById('email').value;

  document.getElementById('open_btn').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('open-sidebar');
});

  // Validación básica
  if (nombre === '') {
    alert('Por favor, ingresa tu nombre.');
    return;
  }

  if (!isValidEmail(email)) {
    alert('Por favor, ingresa un correo electrónico válido.');
    return;
  }

  // Si la validación pasa, puedes enviar el formulario
  form.submit();
});

function isValidEmail(email) {
  // Expresión regular básica para validar correos electrónicos
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}