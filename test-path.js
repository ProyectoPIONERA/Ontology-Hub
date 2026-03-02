const fs = require('fs');
const path = '/app/config/elasticsearch.js';

console.log('--- TEST DE ACCESO ---');
console.log('¿Existe el archivo?:', fs.existsSync(path));
try {
    const stats = fs.statSync(path);
    console.log('Permisos:', stats.mode);
    console.log('Dueño (UID):', stats.uid);
    const content = fs.readFileSync(path, 'utf8');
    console.log('¿Se puede leer el contenido?: SI (leídos ' + content.length + ' bytes)');
} catch (e) {
    console.log('ERROR DE ACCESO:', e.message);
}